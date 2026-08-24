use serde::{Deserialize, Serialize};

#[derive(Serialize)]
pub struct OpenFileArgs {
  pub filters: Vec<FileFilter>,
  pub title: String,
}

#[derive(Serialize)]
pub struct SaveFileArgs {
  pub filters: Vec<FileFilter>,
  pub title: String,
}

#[derive(Serialize)]
pub struct OpenUrlArgs {
  pub url: String,
}

#[derive(Serialize)]
pub struct ReadDirArgs {
  pub path: String,
}

#[derive(Serialize, Deserialize)]
pub struct FileFilter {
  pub name: String,
  pub patterns: Vec<String>,
}

#[derive(Serialize)]
pub struct StartDaemonArgs {
  pub project_id: String,
}

#[derive(Serialize)]
pub struct StopDaemonArgs {}

#[derive(Serialize)]
pub struct StartWebArgs {
  pub port: u16,
}

#[derive(Serialize)]
pub struct StopWebArgs {}

#[derive(Serialize)]
pub enum Command<T> {
  OpenFile(OpenFileArgs),
  SaveFile(SaveFileArgs),
  OpenUrl(OpenUrlArgs),
  ReadDir(ReadDirArgs),
  StartDaemon(StartDaemonArgs),
  StopDaemon(StopDaemonArgs),
  StartWeb(StartWebArgs),
  StopWeb(StopWebArgs),
}

#[derive(Deserialize, Serialize, Clone)]
pub enum CommandResponse {
  Success(CommandData),
  Error(String),
}

#[derive(Deserialize, Serialize, Clone)]
pub enum CommandData {
  OpenFile { filePath: String },
  SaveFile { filePath: String },
  OpenUrl {},
  ReadDir { entries: Vec<DirEntry> },
  StartDaemon { url: String, port: u16 },
  StopDaemon {},
  StartWeb { url: String, port: u16 },
  StopWeb {},
}

#[derive(Deserialize, Serialize, Clone)]
pub struct DirEntry {
  pub name: String,
  pub path: String,
  pub is_dir: bool,
}