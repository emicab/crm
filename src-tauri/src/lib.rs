use std::fs::{self, File};
use std::os::windows::process::CommandExt;
use std::path::Path;
use std::process::{Child, Command, Stdio};
use std::sync::Mutex;
use tauri::{Manager, State};
use keyring::Entry;
use rand::Rng;
use rusqlite::Connection;
use serde::Serialize;

const CREATE_NO_WINDOW: u32 = 0x08000000;

// ── Auto-migration system ──────────────────────────────────────────────
struct Migration {
    version: i32,
    name: &'static str,
    sql: &'static str,
}

/// All schema migrations for the production database.
/// When adding new columns/tables to schema.prisma, also add a Migration entry here
/// so that existing production databases get updated automatically on app startup.
const MIGRATIONS: &[Migration] = &[
    Migration {
        version: 1,
        name: "add_sale_status",
        sql: r#"ALTER TABLE "Sale" ADD COLUMN "status" TEXT NOT NULL DEFAULT 'COMPLETED'"#,
    },
    Migration {
        version: 2,
        name: "add_consignments",
        sql: r#"
            CREATE TABLE IF NOT EXISTS "Consignment" (
                "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
                "clientId" INTEGER NOT NULL,
                "status" TEXT NOT NULL DEFAULT 'DELIVERED',
                "notes" TEXT,
                "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                "updatedAt" DATETIME NOT NULL,
                CONSTRAINT "Consignment_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
            );

            CREATE TABLE IF NOT EXISTS "ConsignmentItem" (
                "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
                "consignmentId" INTEGER NOT NULL,
                "productId" INTEGER NOT NULL,
                "quantityGiven" REAL NOT NULL,
                "quantitySold" REAL NOT NULL DEFAULT 0,
                "quantityReturned" REAL NOT NULL DEFAULT 0,
                "priceAtGiven" DECIMAL NOT NULL,
                CONSTRAINT "ConsignmentItem_consignmentId_fkey" FOREIGN KEY ("consignmentId") REFERENCES "Consignment" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
                CONSTRAINT "ConsignmentItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
            );

            CREATE TABLE IF NOT EXISTS "SavedNote" (
                "id" TEXT NOT NULL PRIMARY KEY,
                "title" TEXT NOT NULL,
                "description" TEXT,
                "content" TEXT NOT NULL,
                "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS "ChatSession" (
                "id" TEXT NOT NULL PRIMARY KEY,
                "title" TEXT NOT NULL,
                "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                "updatedAt" DATETIME NOT NULL
            );

            CREATE TABLE IF NOT EXISTS "ChatMessage" (
                "id" TEXT NOT NULL PRIMARY KEY,
                "sessionId" TEXT NOT NULL,
                "role" TEXT NOT NULL,
                "content" TEXT NOT NULL,
                "suggestions" TEXT,
                "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                "CONSTRAINT ChatMessage_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "ChatSession" ("id") ON DELETE CASCADE ON UPDATE CASCADE
            );
        "#,
    },
    Migration {
        version: 3,
        name: "add_store_config_and_web_orders",
        sql: r#"
            CREATE TABLE IF NOT EXISTS "StoreConfig" (
                "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
                "slug" TEXT NOT NULL UNIQUE,
                "businessName" TEXT NOT NULL,
                "description" TEXT,
                "logoUrl" TEXT,
                "bannerUrl" TEXT,
                "primaryColor" TEXT DEFAULT '#2563eb',
                "isWebActive" BOOLEAN NOT NULL DEFAULT 0,
                "mpAccessToken" TEXT,
                "mpPublicKey" TEXT,
                "mpFeePercent" DECIMAL NOT NULL DEFAULT 0,
                "whatsappPhone" TEXT,
                "minStockBuffer" REAL NOT NULL DEFAULT 1,
                "allowPickup" BOOLEAN NOT NULL DEFAULT 1,
                "allowDelivery" BOOLEAN NOT NULL DEFAULT 1,
                "deliveryFee" DECIMAL NOT NULL DEFAULT 0,
                "minDeliveryAmount" DECIMAL NOT NULL DEFAULT 0,
                "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS "WebOrder" (
                "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
                "webOrderNumber" TEXT NOT NULL UNIQUE,
                "clientName" TEXT NOT NULL,
                "clientEmail" TEXT,
                "clientPhone" TEXT NOT NULL,
                "shippingAddress" TEXT,
                "deliveryType" TEXT NOT NULL,
                "paymentMethod" TEXT NOT NULL,
                "paymentStatus" TEXT NOT NULL,
                "status" TEXT NOT NULL DEFAULT 'PENDING_PREPARATION',
                "totalAmount" DECIMAL NOT NULL,
                "notes" TEXT,
                "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS "WebOrderItem" (
                "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
                "webOrderId" INTEGER NOT NULL,
                "productId" INTEGER NOT NULL,
                "quantity" REAL NOT NULL,
                "unitPrice" DECIMAL NOT NULL,
                "subtotal" DECIMAL NOT NULL,
                CONSTRAINT "WebOrderItem_webOrderId_fkey" FOREIGN KEY ("webOrderId") REFERENCES "WebOrder" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
                CONSTRAINT "WebOrderItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
            );
        "#,
    },
    Migration {
        version: 4,
        name: "add_promotions_and_coupons_and_invoices",
        sql: r#"
            CREATE TABLE IF NOT EXISTS "CreditCardPromotion" (
                "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
                "bank" TEXT NOT NULL,
                "installments" TEXT NOT NULL,
                "startDate" DATETIME,
                "endDate" DATETIME,
                "notes" TEXT,
                "active" BOOLEAN NOT NULL DEFAULT 1,
                "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS "Invoice" (
                "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
                "saleId" INTEGER NOT NULL UNIQUE,
                "cae" TEXT NOT NULL,
                "caeExpiration" DATETIME NOT NULL,
                "invoiceType" TEXT NOT NULL,
                "invoiceNumber" INTEGER NOT NULL,
                "pointOfSale" INTEGER NOT NULL,
                "clientCuit" TEXT,
                "clientName" TEXT,
                "xmlRequest" TEXT,
                "xmlResponse" TEXT,
                "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                CONSTRAINT "Invoice_saleId_fkey" FOREIGN KEY ("saleId") REFERENCES "Sale" ("id") ON DELETE CASCADE ON UPDATE CASCADE
            );

            CREATE TABLE IF NOT EXISTS "Coupon" (
                "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
                "code" TEXT NOT NULL UNIQUE,
                "discountType" TEXT NOT NULL DEFAULT 'PERCENTAGE',
                "discountValue" DECIMAL NOT NULL,
                "minPurchase" DECIMAL DEFAULT 0,
                "maxUses" INTEGER,
                "usedCount" INTEGER NOT NULL DEFAULT 0,
                "startDate" DATETIME,
                "endDate" DATETIME,
                "active" BOOLEAN NOT NULL DEFAULT 1,
                "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
            );

            ALTER TABLE "Client" ADD COLUMN "cuit" TEXT;
            ALTER TABLE "Client" ADD COLUMN "businessName" TEXT;

            ALTER TABLE "DiscountCode" ADD COLUMN "discountType" TEXT DEFAULT 'PERCENTAGE';
            ALTER TABLE "DiscountCode" ADD COLUMN "discountValue" DECIMAL;
            ALTER TABLE "DiscountCode" ADD COLUMN "minPurchase" DECIMAL DEFAULT 0;
        "#,
    },
    Migration {
        version: 5,
        name: "add_missing_ecommerce_columns",
        sql: r#"
            ALTER TABLE "Product" ADD COLUMN "unitType" TEXT;
            ALTER TABLE "Product" ADD COLUMN "isPublicWeb" BOOLEAN NOT NULL DEFAULT 0;
            ALTER TABLE "Product" ADD COLUMN "webCategory" TEXT;
            ALTER TABLE "Product" ADD COLUMN "imageUrl" TEXT;

            ALTER TABLE "Sale" ADD COLUMN "discountCodeApplied" TEXT;
            ALTER TABLE "Sale" ADD COLUMN "promotionsApplied" TEXT;
            ALTER TABLE "Sale" ADD COLUMN "creditCardPromotionId" INTEGER;
            ALTER TABLE "Sale" ADD COLUMN "onAccount" BOOLEAN NOT NULL DEFAULT 0;
        "#,
    },
    Migration {
        version: 6,
        name: "add_images_to_combos_and_promotions",
        sql: r#"
            ALTER TABLE "Combo" ADD COLUMN "imageUrl" TEXT;
            ALTER TABLE "Promotion" ADD COLUMN "imageUrl" TEXT;
        "#,
    },
    Migration {
        version: 7,
        name: "add_store_custom_domain",
        sql: r#"ALTER TABLE "StoreConfig" ADD COLUMN "customDomain" TEXT"#,
    },
    Migration {
        version: 8,
        name: "add_branch_to_sale",
        sql: r#"ALTER TABLE "Sale" ADD COLUMN "branchId" INTEGER"#,
    },
    Migration {
        version: 9,
        name: "add_multi_branch_tables",
        sql: r#"
            CREATE TABLE IF NOT EXISTS "Branch" (
                "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
                "name" TEXT NOT NULL,
                "address" TEXT,
                "phone" TEXT,
                "isMain" BOOLEAN NOT NULL DEFAULT 0,
                "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS "ProductBranchStock" (
                "productId" INTEGER NOT NULL,
                "branchId" INTEGER NOT NULL,
                "quantityStock" REAL NOT NULL DEFAULT 0,
                "minStock" REAL DEFAULT 0,
                "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                PRIMARY KEY ("productId", "branchId"),
                CONSTRAINT "ProductBranchStock_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
                CONSTRAINT "ProductBranchStock_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch" ("id") ON DELETE CASCADE ON UPDATE CASCADE
            );

            CREATE TABLE IF NOT EXISTS "StockTransfer" (
                "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
                "sourceBranchId" INTEGER NOT NULL,
                "targetBranchId" INTEGER NOT NULL,
                "status" TEXT NOT NULL DEFAULT 'COMPLETED',
                "notes" TEXT,
                "createdByName" TEXT,
                "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                CONSTRAINT "StockTransfer_sourceBranchId_fkey" FOREIGN KEY ("sourceBranchId") REFERENCES "Branch" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
                CONSTRAINT "StockTransfer_targetBranchId_fkey" FOREIGN KEY ("targetBranchId") REFERENCES "Branch" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
            );

            CREATE TABLE IF NOT EXISTS "StockTransferItem" (
                "transferId" INTEGER NOT NULL,
                "productId" INTEGER NOT NULL,
                "productName" TEXT,
                "quantity" REAL NOT NULL,
                "receivedQuantity" REAL,
                PRIMARY KEY ("transferId", "productId"),
                CONSTRAINT "StockTransferItem_transferId_fkey" FOREIGN KEY ("transferId") REFERENCES "StockTransfer" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
                CONSTRAINT "StockTransferItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
            );
        "#,
    },
    Migration {
        version: 10,
        name: "add_mp_fee_amount_to_weborder",
        sql: r#"ALTER TABLE "WebOrder" ADD COLUMN "mpFeeAmount" DECIMAL NOT NULL DEFAULT 0"#,
    },
    Migration {
        version: 11,
        name: "add_branch_to_weborder",
        sql: r#"ALTER TABLE "WebOrder" ADD COLUMN "branchId" INTEGER"#,
    },
    Migration {
        version: 12,
        name: "add_sync_outbox",
        sql: r#"
            CREATE TABLE IF NOT EXISTS "SyncOutbox" (
                "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
                "operation" TEXT NOT NULL,
                "entity" TEXT NOT NULL,
                "entityKey" TEXT NOT NULL,
                "status" TEXT NOT NULL DEFAULT 'PENDING',
                "attempts" INTEGER NOT NULL DEFAULT 0,
                "lastError" TEXT,
                "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                "updatedAt" DATETIME NOT NULL
            );
            CREATE INDEX IF NOT EXISTS "SyncOutbox_status_idx" ON "SyncOutbox" ("status");
        "#,
    },
    Migration {
        version: 13,
        name: "make_saleitem_product_optional",
        sql: r#"
            PRAGMA foreign_keys=OFF;
            CREATE TABLE "SaleItem_new" (
                "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
                "quantity" REAL NOT NULL,
                "priceAtSale" DECIMAL NOT NULL,
                "purchasePriceAtSale" DECIMAL NOT NULL,
                "saleId" INTEGER NOT NULL,
                "productId" INTEGER,
                "productName" TEXT,
                CONSTRAINT "SaleItem_saleId_fkey" FOREIGN KEY ("saleId") REFERENCES "Sale" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
                CONSTRAINT "SaleItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product" ("id") ON DELETE SET NULL ON UPDATE CASCADE
            );
            INSERT INTO "SaleItem_new" ("id", "quantity", "priceAtSale", "purchasePriceAtSale", "saleId", "productId", "productName")
                SELECT "id", "quantity", "priceAtSale", "purchasePriceAtSale", "saleId", "productId",
                       (SELECT "name" FROM "Product" WHERE "Product"."id" = "SaleItem"."productId")
                FROM "SaleItem";
            DROP TABLE "SaleItem";
            ALTER TABLE "SaleItem_new" RENAME TO "SaleItem";
            CREATE INDEX IF NOT EXISTS "SaleItem_saleId_idx" ON "SaleItem" ("saleId");
            CREATE INDEX IF NOT EXISTS "SaleItem_productId_idx" ON "SaleItem" ("productId");
            PRAGMA foreign_keys=ON;
        "#,
    },
    Migration {
        version: 14,
        name: "add_recetario",
        sql: r#"
            ALTER TABLE "Product" ADD COLUMN "isRecipe" BOOLEAN NOT NULL DEFAULT 0;

            CREATE TABLE IF NOT EXISTS "RecipeItem" (
                "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
                "productId" INTEGER NOT NULL,
                "ingredientId" INTEGER NOT NULL,
                "quantity" REAL NOT NULL,
                "unitType" TEXT NOT NULL,
                CONSTRAINT "RecipeItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
                CONSTRAINT "RecipeItem_ingredientId_fkey" FOREIGN KEY ("ingredientId") REFERENCES "Product" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
            );
            CREATE INDEX IF NOT EXISTS "RecipeItem_productId_idx" ON "RecipeItem" ("productId");
            CREATE INDEX IF NOT EXISTS "RecipeItem_ingredientId_idx" ON "RecipeItem" ("ingredientId");
        "#,
    },
    Migration {
        version: 15,
        name: "recetario_ingredientes_marca_categoria_opcionales",
        sql: r#"
            PRAGMA foreign_keys=OFF;
            CREATE TABLE "Product_new" (
                "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
                "name" TEXT NOT NULL,
                "sku" TEXT,
                "description" TEXT,
                "pricePurchase" DECIMAL NOT NULL,
                "priceSale" DECIMAL NOT NULL,
                "quantityStock" REAL NOT NULL,
                "stockMinAlert" REAL,
                "unitType" TEXT,
                "isPublicWeb" BOOLEAN NOT NULL DEFAULT 0,
                "webCategory" TEXT,
                "imageUrl" TEXT,
                "brandId" INTEGER,
                "categoryId" INTEGER,
                "supplierId" INTEGER,
                "isRecipe" BOOLEAN NOT NULL DEFAULT 0,
                "isIngredient" BOOLEAN NOT NULL DEFAULT 0,
                "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                "updatedAt" DATETIME NOT NULL,
                CONSTRAINT "Product_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
                CONSTRAINT "Product_brandId_fkey" FOREIGN KEY ("brandId") REFERENCES "Brand" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
                CONSTRAINT "Product_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier" ("id") ON DELETE SET NULL ON UPDATE CASCADE
            );
            INSERT INTO "Product_new" ("id", "name", "sku", "description", "pricePurchase", "priceSale", "quantityStock", "stockMinAlert", "unitType", "isPublicWeb", "webCategory", "imageUrl", "brandId", "categoryId", "supplierId", "isRecipe", "isIngredient", "createdAt", "updatedAt")
                SELECT "id", "name", "sku", "description", "pricePurchase", "priceSale", "quantityStock", "stockMinAlert", "unitType", "isPublicWeb", "webCategory", "imageUrl", "brandId", "categoryId", "supplierId", "isRecipe", 0, "createdAt", "updatedAt"
                FROM "Product";
            DROP TABLE "Product";
            ALTER TABLE "Product_new" RENAME TO "Product";
            CREATE UNIQUE INDEX IF NOT EXISTS "Product_sku_key" ON "Product"("sku");
            PRAGMA foreign_keys=ON;
        "#,
    },
    Migration {
        version: 16,
        name: "add_recipe_cost_history",
        sql: r#"
            CREATE TABLE IF NOT EXISTS "RecipeCostHistory" (
                "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
                "productId" INTEGER NOT NULL,
                "cost" DECIMAL NOT NULL,
                "hasFullCost" BOOLEAN NOT NULL DEFAULT 1,
                "source" TEXT NOT NULL,
                "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                CONSTRAINT "RecipeCostHistory_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product" ("id") ON DELETE CASCADE ON UPDATE CASCADE
            );
            CREATE INDEX IF NOT EXISTS "RecipeCostHistory_productId_idx" ON "RecipeCostHistory" ("productId");
            CREATE INDEX IF NOT EXISTS "RecipeCostHistory_createdAt_idx" ON "RecipeCostHistory" ("createdAt");
        "#,
    },
    Migration {
        version: 17,
        name: "add_product_modifiers_and_business_sector",
        sql: r#"
            ALTER TABLE "StoreConfig" ADD COLUMN "businessSector" TEXT NOT NULL DEFAULT 'GASTRONOMIA';

            ALTER TABLE "WebOrder" ADD COLUMN "scheduledFor" DATETIME;

            ALTER TABLE "WebOrderItem" ADD COLUMN "modifiers" TEXT;

            ALTER TABLE "SaleItem" ADD COLUMN "modifiers" TEXT;

            CREATE TABLE IF NOT EXISTS "ProductModifierGroup" (
                "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
                "productId" INTEGER NOT NULL,
                "name" TEXT NOT NULL,
                "type" TEXT NOT NULL DEFAULT 'MULTI_SELECT',
                "isRequired" BOOLEAN NOT NULL DEFAULT 0,
                "minSelect" INTEGER NOT NULL DEFAULT 0,
                "maxSelect" INTEGER,
                "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                CONSTRAINT "ProductModifierGroup_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product" ("id") ON DELETE CASCADE ON UPDATE CASCADE
            );
            CREATE INDEX IF NOT EXISTS "ProductModifierGroup_productId_idx" ON "ProductModifierGroup" ("productId");

            CREATE TABLE IF NOT EXISTS "ProductModifierOption" (
                "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
                "modifierGroupId" INTEGER NOT NULL,
                "name" TEXT NOT NULL,
                "priceExtra" DECIMAL NOT NULL DEFAULT 0,
                "colorHex" TEXT,
                "ingredientId" INTEGER,
                "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                CONSTRAINT "ProductModifierOption_modifierGroupId_fkey" FOREIGN KEY ("modifierGroupId") REFERENCES "ProductModifierGroup" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
                CONSTRAINT "ProductModifierOption_ingredientId_fkey" FOREIGN KEY ("ingredientId") REFERENCES "Product" ("id") ON DELETE SET NULL ON UPDATE CASCADE
            );
            CREATE INDEX IF NOT EXISTS "ProductModifierOption_modifierGroupId_idx" ON "ProductModifierOption" ("modifierGroupId");
        "#,
    },
    Migration {
        version: 18,
        name: "add_modifier_option_ingredient_qty",
        sql: r#"
            ALTER TABLE "ProductModifierOption" ADD COLUMN "ingredientQty" DECIMAL NOT NULL DEFAULT 1;
        "#,
    },
    Migration {
        version: 19,
        name: "add_weborder_discount_fields",
        sql: r#"
            ALTER TABLE "WebOrder" ADD COLUMN "subtotalAmount" DECIMAL NOT NULL DEFAULT 0;
            ALTER TABLE "WebOrder" ADD COLUMN "discountAmount" DECIMAL NOT NULL DEFAULT 0;
            ALTER TABLE "WebOrder" ADD COLUMN "deliveryFee" DECIMAL NOT NULL DEFAULT 0;
            ALTER TABLE "WebOrder" ADD COLUMN "couponCode" TEXT;
        "#,
    },
    Migration {
        version: 20,
        name: "add_weborder_origin",
        sql: r#"
            ALTER TABLE "WebOrder" ADD COLUMN "origin" TEXT;
        "#,
    },
    Migration {
        version: 21,
        name: "fase2_delivery_zones_and_stock_review",
        sql: r#"
            ALTER TABLE "StoreConfig" ADD COLUMN "lat" REAL;
            ALTER TABLE "StoreConfig" ADD COLUMN "lng" REAL;
            ALTER TABLE "StoreConfig" ADD COLUMN "deliveryZones" TEXT;
            ALTER TABLE "StoreConfig" ADD COLUMN "openingHours" TEXT;
            ALTER TABLE "WebOrder" ADD COLUMN "deliveryZone" TEXT;
            ALTER TABLE "WebOrder" ADD COLUMN "trackingCode" TEXT;
            ALTER TABLE "WebOrder" ADD COLUMN "stockReviewNote" TEXT;
            ALTER TABLE "WebOrder" ADD COLUMN "stockReviewAt" DATETIME;
            ALTER TABLE "WebOrder" ADD COLUMN "mpPaymentId" TEXT;
        "#,
    },
    Migration {
        version: 22,
        name: "add_weborder_discount_breakdown",
        sql: r#"
            ALTER TABLE "WebOrder" ADD COLUMN "discountBreakdown" TEXT;
        "#,
    },
    Migration {
        version: 23,
        name: "add_product_web_unavailable",
        sql: r#"
            ALTER TABLE "Product" ADD COLUMN "webUnavailable" INTEGER NOT NULL DEFAULT 0;
        "#,
    },
];

fn run_migrations(db_path: &Path) {
    let conn = match Connection::open(db_path) {
        Ok(c) => c,
        Err(e) => {
            eprintln!("[Migrations] Failed to open database: {}", e);
            return;
        }
    };

    // Create the migrations tracking table if it doesn't exist
    if let Err(e) = conn.execute_batch(
        "CREATE TABLE IF NOT EXISTS _app_migrations (
            version INTEGER PRIMARY KEY,
            name TEXT NOT NULL,
            applied_at TEXT NOT NULL DEFAULT (datetime('now'))
        )"
    ) {
        eprintln!("[Migrations] Failed to create tracking table: {}", e);
        return;
    }

    for migration in MIGRATIONS {
        let already_applied: bool = conn
            .query_row(
                "SELECT COUNT(*) > 0 FROM _app_migrations WHERE version = ?1",
                [migration.version],
                |row| row.get(0),
            )
            .unwrap_or(false);

        if already_applied {
            continue;
        }

        println!("[Migrations] Applying v{}: {} ...", migration.version, migration.name);

        let mut has_error = false;
        for statement in migration.sql.split(';') {
            let stmt = statement.trim();
            if stmt.is_empty() {
                continue;
            }
            if let Err(e) = conn.execute(stmt, []) {
                let err_msg = e.to_string();
                if err_msg.contains("duplicate column") || err_msg.contains("already exists") {
                    println!("[Migrations] Statement already applied: {}", err_msg);
                } else {
                    eprintln!("[Migrations] Error executing statement ({}): {}", stmt, e);
                    has_error = true;
                }
            }
        }

        if !has_error {
            let _ = conn.execute(
                "INSERT INTO _app_migrations (version, name) VALUES (?1, ?2)",
                rusqlite::params![migration.version, migration.name],
            );
            println!("[Migrations] ✓ v{} applied successfully", migration.version);
        }
    }
}
// ── End auto-migration system ──────────────────────────────────────────

struct ServerState(Mutex<Option<Child>>);

#[derive(Serialize)]
struct BackupResult {
    success: bool,
    path: Option<String>,
    error: Option<String>,
    canceled: bool,
}

#[derive(Serialize)]
struct RestoreResult {
    success: bool,
    message: Option<String>,
    error: Option<String>,
    canceled: bool,
}

#[derive(Serialize)]
struct SaveFileResult {
    success: bool,
    path: Option<String>,
    error: Option<String>,
    canceled: bool,
}

fn get_db_path(app_handle: &tauri::AppHandle) -> std::path::PathBuf {
    app_handle.path().app_data_dir().unwrap_or_else(|_| std::env::temp_dir()).join("crm_prod.db")
}

#[tauri::command]
async fn backup_database(app_handle: tauri::AppHandle) -> Result<BackupResult, String> {
    let db_path = get_db_path(&app_handle);
    if !db_path.exists() {
        return Ok(BackupResult { success: false, path: None, error: Some("Base de datos no encontrada.".into()), canceled: false });
    }

    use tauri_plugin_dialog::DialogExt;
    let file_path = app_handle.dialog()
        .file()
        .add_filter("SQLite Database", &["db"])
        .set_file_name(&format!("backup_crm_{}.db", chrono::Local::now().format("%Y-%m-%d")))
        .blocking_save_file();

    match file_path {
        Some(path) => {
            let path_str = path.into_path().unwrap();
            match fs::copy(&db_path, &path_str) {
                Ok(_) => Ok(BackupResult { success: true, path: Some(path_str.to_string_lossy().into_owned()), error: None, canceled: false }),
                Err(e) => Ok(BackupResult { success: false, path: None, error: Some(e.to_string()), canceled: false }),
            }
        },
        None => Ok(BackupResult { success: false, path: None, error: None, canceled: true }),
    }
}

#[tauri::command]
async fn restore_database(app_handle: tauri::AppHandle) -> Result<RestoreResult, String> {
    let db_path = get_db_path(&app_handle);

    use tauri_plugin_dialog::DialogExt;
    let file_path = app_handle.dialog()
        .file()
        .add_filter("SQLite Database", &["db"])
        .blocking_pick_file();

    match file_path {
        Some(path) => {
            let source_path = path.into_path().unwrap();
            let mut temp_backup = db_path.clone();
            temp_backup.set_extension("db.backup_temp");
            
            if db_path.exists() {
                let _ = fs::copy(&db_path, &temp_backup);
            }
            
            match fs::copy(&source_path, &db_path) {
                Ok(_) => {
                    if temp_backup.exists() {
                        let _ = fs::remove_file(&temp_backup);
                    }
                    Ok(RestoreResult { success: true, message: Some("Base de datos restaurada. Se recomienda reiniciar la aplicación.".into()), error: None, canceled: false })
                },
                Err(e) => {
                    if temp_backup.exists() {
                        let _ = fs::copy(&temp_backup, &db_path);
                        let _ = fs::remove_file(&temp_backup);
                    }
                    Ok(RestoreResult { success: false, message: None, error: Some(e.to_string()), canceled: false })
                }
            }
        },
        None => Ok(RestoreResult { success: false, message: None, error: None, canceled: true }),
    }
}

#[tauri::command]
async fn save_report_file(
    app_handle: tauri::AppHandle,
    content_b64: String,
    file_name: String,
    ext: String,
) -> Result<SaveFileResult, String> {
    use base64::{engine::general_purpose::STANDARD as B64, Engine as _};
    use tauri_plugin_dialog::DialogExt;

    let file_path = app_handle
        .dialog()
        .file()
        .add_filter("Archivo", &[ext.as_str()])
        .set_file_name(&file_name)
        .blocking_save_file();

    match file_path {
        Some(path) => {
            let path_str = path.into_path().unwrap();
            match B64.decode(&content_b64) {
                Ok(bytes) => match fs::write(&path_str, &bytes) {
                    Ok(_) => Ok(SaveFileResult {
                        success: true,
                        path: Some(path_str.to_string_lossy().into_owned()),
                        error: None,
                        canceled: false,
                    }),
                    Err(e) => Ok(SaveFileResult {
                        success: false,
                        path: None,
                        error: Some(e.to_string()),
                        canceled: false,
                    }),
                },
                Err(e) => Ok(SaveFileResult {
                    success: false,
                    path: None,
                    error: Some(e.to_string()),
                    canceled: false,
                }),
            }
        }
        None => Ok(SaveFileResult {
            success: false,
            path: None,
            error: None,
            canceled: true,
        }),
    }
}

#[tauri::command]
async fn kill_server(state: tauri::State<'_, ServerState>) -> Result<(), String> {
    if let Ok(mut server_state) = state.0.lock() {
        if let Some(mut child) = server_state.take() {
            let _ = child.kill();
            let _ = child.wait();
        }
    }
    Ok(())
}
#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  tauri::Builder::default()
    .plugin(tauri_plugin_shell::init())
    .plugin(tauri_plugin_updater::Builder::new().build())
    .plugin(tauri_plugin_dialog::init())
    .manage(ServerState(Mutex::new(None)))
    .invoke_handler(tauri::generate_handler![backup_database, restore_database, kill_server, save_report_file])
    .setup(|app| {
      #[cfg(debug_assertions)]
      {
        let _ = app.handle().plugin(
          tauri_plugin_log::Builder::default()
            .level(log::LevelFilter::Info)
            .build(),
        );
      }

      #[cfg(not(debug_assertions))]
      {
        let resource_dir = app.path().resource_dir().unwrap_or_default();
        let app_data_dir = app.path().app_data_dir().unwrap_or_else(|_| {
          std::env::temp_dir()
        });

        let _ = fs::create_dir_all(&app_data_dir);

        let target_db = app_data_dir.join("crm_prod.db");
        let template_db = if resource_dir.join("_up_").join("prisma").join("crm_template.db").exists() {
          resource_dir.join("_up_").join("prisma").join("crm_template.db")
        } else {
          resource_dir.join("crm_template.db")
        };

        if !target_db.exists() && template_db.exists() {
          let _ = fs::copy(&template_db, &target_db);
        }

        // Run auto-migrations before starting the server
        run_migrations(&target_db);

        let db_url = format!("file:{}", target_db.to_string_lossy().replace('\\', "/"));

        let standalone_dir = if resource_dir.join("_up_").join("app_standalone").join("server.js").exists() {
          resource_dir.join("_up_").join("app_standalone")
        } else if resource_dir.join("app_standalone").join("server.js").exists() {
          resource_dir.join("app_standalone")
        } else {
          resource_dir.clone()
        };

        let server_js = standalone_dir.join("server.js");
        let local_node = standalone_dir.join("node.exe");

        // KEYRING LOGIC: Get or create secure encryption secret
        let service = "com.emidev.clinpos";
        let user = "clinpos_encryption_secret";
        let entry = Entry::new(service, user).expect("Failed to access keyring");
        let encryption_secret = match entry.get_password() {
            Ok(secret) => secret,
            Err(_) => {
                // Generate a new 64-char random secret
                const CHARSET: &[u8] = b"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*";
                let mut rng = rand::thread_rng();
                let new_secret: String = (0..64)
                    .map(|_| {
                        let idx = rng.gen_range(0..CHARSET.len());
                        CHARSET[idx] as char
                    })
                    .collect();
                
                let _ = entry.set_password(&new_secret);
                new_secret
            }
        };

        // Generate a random APP_SECRET to protect the local server from browser access
        let app_secret: String = {
            let mut rng = rand::thread_rng();
            const CHARSET: &[u8] = b"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
            (0..48).map(|_| { let idx = rng.gen_range(0..CHARSET.len()); CHARSET[idx] as char }).collect()
        };

        if server_js.exists() {
          let node_bin = if local_node.exists() {
            local_node.to_string_lossy().to_string()
          } else {
            "node".to_string()
          };

          let log_file_path = app_data_dir.join("server.log");
          let log_file = File::create(&log_file_path).expect("failed to create log file");
          let err_file = log_file.try_clone().expect("failed to clone log file");

          let node_bin_clean = node_bin.replace("\\\\?\\", "");
          let server_js_clean = server_js.to_string_lossy().replace("\\\\?\\", "");
          let standalone_dir_clean = standalone_dir.to_string_lossy().replace("\\\\?\\", "");


          let mut cmd = Command::new(node_bin_clean);
          cmd.arg(server_js_clean);
          cmd.current_dir(standalone_dir_clean);
          cmd.env("PORT", "3001");
          cmd.env("NODE_ENV", "production");
          cmd.env("DATABASE_URL", db_url);
          cmd.env("CLINPOS_ENCRYPTION_SECRET", encryption_secret);
          cmd.env("APP_SECRET", &app_secret);

          cmd.creation_flags(CREATE_NO_WINDOW);
          cmd.stdout(Stdio::from(log_file));
          cmd.stderr(Stdio::from(err_file));

          if let Ok(child) = cmd.spawn() {
            if let Ok(mut state) = app.state::<ServerState>().0.lock() {
              *state = Some(child);
            }
          }
        }

          // Store app_secret for the webview navigation
          let secret_for_nav = app_secret.clone();

          let app_handle = app.handle().clone();
          std::thread::spawn(move || {
            let port = 3001;
            // Navigate with secret as query param; middleware will set a cookie
            let target_url = format!("http://localhost:{}?_token={}", port, secret_for_nav);

            for _ in 0..120 {
              if std::net::TcpStream::connect(("127.0.0.1", port)).is_ok() {
                if let Some(window) = app_handle.get_webview_window("main") {
                  let url: tauri::Url = target_url.parse().unwrap();
                  let _ = window.navigate(url);
                }
                break;
              }
              std::thread::sleep(std::time::Duration::from_millis(250));
            }
          });
      }

      Ok(())
    })
    .on_window_event(|window, event| {
      if let tauri::WindowEvent::Destroyed = event {
        if let Ok(mut state) = window.state::<ServerState>().0.lock() {
          if let Some(mut child) = state.take() {
            let _ = child.kill();
            let _ = child.wait();
          }
        }
      }
    })
    .build(tauri::generate_context!())
    .expect("error while building tauri application")
    .run(|app_handle, event| {
      match event {
        tauri::RunEvent::ExitRequested { .. } | tauri::RunEvent::Exit => {
          if let Ok(mut state) = app_handle.state::<ServerState>().0.lock() {
            if let Some(mut child) = state.take() {
              let _ = child.kill();
              let _ = child.wait();
            }
          }
        }
        _ => {}
      }
    });
}
