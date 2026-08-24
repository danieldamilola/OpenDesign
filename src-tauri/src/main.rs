// Tauri entry point
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use tauri_plugin_updater::UpdaterExt;

mod commands;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_opener::init())
        .setup(|app| {
            let handle = app.handle().clone();
            tauri::async_runtime::spawn(async move {
                check_for_updates(handle).await;
            });
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
          commands::open_file_dialog,
          commands::save_file_dialog,
          commands::open_url,
          commands::read_dir,
          commands::start_daemon,
          commands::stop_daemon,
          commands::start_web,
          commands::stop_web,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

async fn check_for_updates(handle: tauri::AppHandle) {
    let updater = handle.updater().expect("Failed to get updater");
    if let Ok(Some(update)) = updater.check().await {
        println!("Update available: {}", update.version);
    }
}