use std::fs::{self, File};
use std::os::windows::process::CommandExt;
use std::process::{Child, Command, Stdio};
use std::sync::Mutex;
use tauri::Manager;

const CREATE_NO_WINDOW: u32 = 0x08000000;

struct ServerState(Mutex<Option<Child>>);

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  tauri::Builder::default()
    .manage(ServerState(Mutex::new(None)))
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

        let db_url = format!("file:{}", target_db.to_string_lossy().replace('\\', "/"));

        let standalone_dir = if resource_dir.join("_up_").join(".next").join("standalone").join("server.js").exists() {
          resource_dir.join("_up_").join(".next").join("standalone")
        } else if resource_dir.join("standalone").join("server.js").exists() {
          resource_dir.join("standalone")
        } else {
          resource_dir.clone()
        };

        let server_js = standalone_dir.join("server.js");
        let local_node = standalone_dir.join("node.exe");

        // DEBUG: Write paths to temp dir
        let debug_info = format!("resource_dir: {:?}\napp_data_dir: {:?}\nstandalone_dir: {:?}\nserver_js exists: {}\nlocal_node exists: {}\n", 
            resource_dir, app_data_dir, standalone_dir, server_js.exists(), local_node.exists());
        let _ = fs::write(std::env::temp_dir().join("clinpos_debug.txt"), debug_info);

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
