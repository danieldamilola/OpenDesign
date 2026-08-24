use tauri::command;
use tauri::AppHandle;
use serde::{Deserialize, Serialize};
use serde_json::Error as JsonError;

#[derive(Serialize, Deserialize, Clone)]
pub struct OpenFileArgs {
  pub filters: Vec<FileFilter>,
  pub title: String,
}

#[derive(Serialize, Deserialize, Clone)]
pub struct FileFilter {
  pub name: String,
  pub patterns: Vec<String>,
}

#[derive(Serialize, Deserialize, Clone)]
pub struct SaveFileArgs {
  pub filters: Vec<FileFilter>,
  pub title: String,
}

#[derive(Serialize, Deserialize, Clone)]
pub struct OpenUrlArgs {
  pub url: String,
}

#[derive(Serialize, Deserialize, Clone)]
pub struct ReadDirArgs {
  pub path: String,
}

#[derive(Serialize, Deserialize, Clone)]
pub struct StartDaemonArgs {
  pub project_id: String,
}

#[derive(Serialize, Deserialize, Clone)]
pub struct StopDaemonArgs {}

#[derive(Serialize, Deserialize, Clone)]
pub struct StartWebArgs {
  pub port: u16,
}

#[derive(Serialize, Deserialize, Clone)]
pub struct StopWebArgs {}

#[command]
pub async fn open_file_dialog(
  _app: AppHandle,
  args: OpenFileArgs,
) -> Result<String, String> {
  serde_json::to_string(&args).map_err(|e| e.to_string())
}

#[command]
pub async fn save_file_dialog(
  _app: AppHandle,
  args: SaveFileArgs,
) -> Result<String, String> {
  serde_json::to_string(&args).map_err(|e| e.to_string())
}

#[command]
pub async fn open_url(args: OpenUrlArgs) -> Result<String, String> {
  serde_json::to_string(&args).map_err(|e| e.to_string())?;
  Ok("ok".to_string())
}

#[command]
pub async fn read_dir(args: ReadDirArgs) -> Result<String, String> {
  serde_json::to_string(&args).map_err(|e| e.to_string())
}

#[command]
pub async fn start_daemon(
  _args: StartDaemonArgs,
  _app: AppHandle,
) -> Result<String, String> {
  Ok("daemon started".to_string())
}

#[command]
pub async fn stop_daemon() -> Result<String, String> {
  Ok("daemon stopped".to_string())
}

#[command]
pub async fn start_web(
  _args: StartWebArgs,
  _app: AppHandle,
) -> Result<String, String> {
  Ok("web server started".to_string())
}

#[command]
pub async fn stop_web() -> Result<String, String> {
  Ok("web server stopped".to_string())
}