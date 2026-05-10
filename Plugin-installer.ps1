Add-Type -AssemblyName System.Windows.Forms

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$pluginName = "musescore-linter-plugin"

function Find-MuseScorePluginDir {
    $iniPath = "$env:APPDATA\MuseScore\MuseScore4\MuseScore4.ini"
    if (Test-Path $iniPath) {
        $match = (Get-Content $iniPath) | Select-String "(?i)userPluginsPath\s*=\s*(.+)"
        if ($match) {
            $path = $match.Matches[0].Groups[1].Value.Trim()
            if ($path -and (Test-Path $path)) { return $path }
        }
    }

    $docs = "$env:USERPROFILE\Documents\MuseScore4\Plugins"
    if (Test-Path $docs) { return $docs }

    $appdata = "$env:APPDATA\MuseScore\MuseScore4\plugins"
    if (Test-Path $appdata) { return $appdata }

    return "$env:USERPROFILE\Documents\MuseScore4\Plugins"
}

$pluginDir = Find-MuseScorePluginDir
$destDir   = Join-Path $pluginDir $pluginName

$existing = Test-Path $destDir
$msg = if ($existing) {
    "以下の場所に既存のプラグインが見つかりました。上書きしますか？`n`n$destDir"
} else {
    "以下の場所にプラグインをコピーしますか？`n`n$destDir"
}

$result = [System.Windows.Forms.MessageBox]::Show(
    $msg,
    "Score Linter インストール",
    [System.Windows.Forms.MessageBoxButtons]::YesNo,
    [System.Windows.Forms.MessageBoxIcon]::Question
)

if ($result -ne [System.Windows.Forms.DialogResult]::Yes) { exit 0 }

if ($existing) { Remove-Item -Recurse -Force $destDir }
New-Item -ItemType Directory -Force $destDir | Out-Null

Copy-Item "$scriptDir\ScoreLinter.qml" $destDir
Copy-Item -Recurse "$scriptDir\dist" $destDir
Copy-Item -Recurse "$scriptDir\qml" $destDir
Copy-Item "$scriptDir\README.md" $destDir

[System.Windows.Forms.MessageBox]::Show(
    "インストールが完了しました。`nMuseScore 4 を起動し、プラグインマネージャーで「Score Linter」を有効にしてください。",
    "インストール完了",
    [System.Windows.Forms.MessageBoxButtons]::OK,
    [System.Windows.Forms.MessageBoxIcon]::Information
)
