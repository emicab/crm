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
        // Check if already applied
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

        match conn.execute_batch(migration.sql) {
            Ok(_) => {
                // Record migration as applied
                let _ = conn.execute(
                    "INSERT INTO _app_migrations (version, name) VALUES (?1, ?2)",
                    rusqlite::params![migration.version, migration.name],
                );
                println!("[Migrations] ✓ v{} applied successfully", migration.version);
            }
            Err(e) => {
                // If the error is "duplicate column", the migration was already
                // applied manually — record it and move on.
                let err_msg = e.to_string();
                if err_msg.contains("duplicate column") || err_msg.contains("already exists") {
                    let _ = conn.execute(
                        "INSERT INTO _app_migrations (version, name) VALUES (?1, ?2)",
                        rusqlite::params![migration.version, migration.name],
                    );
                    println!("[Migrations] ✓ v{} already applied (recorded)", migration.version);
                } else {
                    eprintln!("[Migrations] ✗ v{} failed: {}", migration.version, e);
                }
            }
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

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  tauri::Builder::default()
    .plugin(tauri_plugin_shell::init())
    .plugin(tauri_plugin_updater::Builder::new().build())
    .plugin(tauri_plugin_dialog::init())
    .manage(ServerState(Mutex::new(None)))
    .invoke_handler(tauri::generate_handler![backup_database, restore_database])
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
          cmd.creation_flags(CREATE_NO_WINDOW);
          cmd.stdout(Stdio::from(log_file));
          cmd.stderr(Stdio::from(err_file));

          if let Ok(child) = cmd.spawn() {
            if let Ok(mut state) = app.state::<ServerState>().0.lock() {
              *state = Some(child);
            }
          }
        }

        let app_handle = app.handle().clone();
        std::thread::spawn(move || {
          let port = 3001;
          let target_url = format!("http://localhost:{}", port);

          for _ in 0..120 {
            if std::net::TcpStream::connect(("127.0.0.1", port)).is_ok() {
              if let Some(window) = app_handle.get_webview_window("main") {
                let _ = window.navigate(target_url.parse().unwrap());
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
          }
        }
      }
    })
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
