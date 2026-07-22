use std::process::{Child, Command};
use std::sync::Mutex;
use tauri::{Manager, State};

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
        let standalone_dir = resource_dir.join("standalone");
        let server_js = standalone_dir.join("server.js");

        if server_js.exists() {
          let mut cmd = Command::new("node");
          cmd.arg(&server_js);
          cmd.current_dir(&standalone_dir);
          cmd.env("PORT", "3001");
          cmd.env("NODE_ENV", "production");

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

          for _ in 0..80 {
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
