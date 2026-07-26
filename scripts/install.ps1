<#
.SYNOPSIS
    Install IDEOCODE on Windows.
.DESCRIPTION
    Downloads the latest IDEOCODE release and installs it to %LOCALAPPDATA%\IDEOCODE\bin.

    One-liner install:
      irm https://raw.githubusercontent.com/nareinnprs-create/ideocode/master/scripts/install.ps1 | iex

    Or download and run (allows parameters):
      & ([scriptblock]::Create((irm https://raw.githubusercontent.com/nareinnprs-create/ideocode/master/scripts/install.ps1)))
.PARAMETER InstallDir
    Override the installation directory (default: $env:LOCALAPPDATA\IDEOCODE\bin)
.PARAMETER Version
    Override the version tag to install. Required when using a local artifact path.
.PARAMETER ArtifactExePath
    Use a local IDEOCODE.exe artifact instead of downloading from GitHub.
.PARAMETER ArtifactTgzPath
    Use a local IDEOCODE .tar.gz artifact instead of downloading from GitHub.
.PARAMETER BuildFromSource
    If no prebuilt release asset is available, explicitly allow a source build.
    Source builds require Git, Rust, and the Visual Studio C++ Build Tools.
.PARAMETER ConfigureAlacritty
    Install Alacritty through winget when it is not already available.
.PARAMETER ConfigureHotkey
    Configure the optional global launch hotkey.
.PARAMETER SkipAlacrittySetup
    Deprecated compatibility switch. Alacritty setup is opt-in by default.
.PARAMETER SkipHotkeySetup
    Deprecated compatibility switch. Hotkey setup is opt-in by default.
#>
param(
    [string]$InstallDir,
    [string]$Version,
    [string]$ArtifactExePath,
    [string]$ArtifactTgzPath,
    [switch]$BuildFromSource,
    [switch]$ConfigureAlacritty,
    [switch]$ConfigureHotkey,
    [switch]$SkipAlacrittySetup,
    [switch]$SkipHotkeySetup
)

$ErrorActionPreference = 'Stop'

if ($PSVersionTable.PSVersion.Major -lt 5) {
    Write-Host "error: PowerShell 5.1 or later is required" -ForegroundColor Red
    exit 1
}

$Repo = "nareinnprs-create/ideocode"
$ReleaseMetadataBase = if ($env:IDEOCODE_RELEASE_METADATA_BASE) {
    $env:IDEOCODE_RELEASE_METADATA_BASE.TrimEnd('/')
} else {
    "https://raw.githubusercontent.com/nareinnprs-create/ideocode/master/releases"
}

if (-not $InstallDir) {
    $localAppData = if ($env:LOCALAPPDATA) { $env:LOCALAPPDATA } else { [Environment]::GetFolderPath([Environment+SpecialFolder]::LocalApplicationData) }
    if (-not $localAppData -and $env:USERPROFILE) { $localAppData = Join-Path $env:USERPROFILE "AppData\Local" }
    $InstallDir = Join-Path $localAppData "IDEOCODE\bin"
}

$IDEOCODEHome = if ($env:IDEOCODE_HOME) {
    $env:IDEOCODE_HOME
} elseif ($env:USERPROFILE) {
    Join-Path $env:USERPROFILE ".IDEOCODE"
} else {
    Join-Path ([Environment]::GetFolderPath("UserProfile")) ".IDEOCODE"
}

$HotkeyDir = Join-Path $IDEOCODEHome "hotkey"
$SetupHintsPath = Join-Path $IDEOCODEHome "setup_hints.json"

function Write-Info($msg) { Write-Host $msg -ForegroundColor Blue }
function Write-Err($msg) { throw "error: $msg" }
function Write-Warn($msg) { Write-Host "warning: $msg" -ForegroundColor Yellow }

function ConvertFrom-IDEOCODEWebContent($Content) {
    if ($null -eq $Content) { return "" }

    # Windows PowerShell 5.1 returns Byte[] for some text responses when the
    # server uses application/octet-stream (including IDEOCODE.sh metadata and
    # GitHub release checksum manifests). Casting Byte[] directly to [string]
    # produces a space-separated list of decimal bytes instead of the text.
    if ($Content -is [byte[]]) {
        return [System.Text.Encoding]::UTF8.GetString($Content)
    }

    return [string]$Content
}

function Test-IDEOCODEReleaseTag([string]$Tag) {
    return [bool]($Tag -match '^v[0-9]+\.[0-9]+\.[0-9]+(?:[+.-][A-Za-z0-9.-]+)?$')
}

function Resolve-IDEOCODEReleaseTagFromUri([string]$Uri) {
    if (-not $Uri) { return $null }
    if ($Uri -match '/releases/tag/([^/?#]+)') {
        return [Uri]::UnescapeDataString($Matches[1])
    }
    return $null
}

function Get-LatestIDEOCODEReleaseTag {
    # Avoid api.github.com here. Its unauthenticated limit is only 60 requests
    # per public IP per hour, so installs are unreliable behind shared NAT/VPNs.
    $metadataTag = $null
    try {
        $metadataResponse = Invoke-WebRequest -UseBasicParsing -Uri "$ReleaseMetadataBase/latest/version"
        $candidate = (ConvertFrom-IDEOCODEWebContent -Content $metadataResponse.Content).Trim()
        if (Test-IDEOCODEReleaseTag $candidate) { $metadataTag = $candidate }
    } catch {}

    try {
        $response = Invoke-WebRequest -UseBasicParsing -Method Head -Uri "https://github.com/$Repo/releases/latest"
        $baseResponse = $response.BaseResponse
        $resolvedUri = $null

        if ($baseResponse) {
            $responseUriProperty = $baseResponse.PSObject.Properties['ResponseUri']
            if ($responseUriProperty -and $responseUriProperty.Value) {
                $resolvedUri = [string]$responseUriProperty.Value
            }

            if (-not $resolvedUri) {
                $requestMessageProperty = $baseResponse.PSObject.Properties['RequestMessage']
                if ($requestMessageProperty -and $requestMessageProperty.Value) {
                    $resolvedUri = [string]$requestMessageProperty.Value.RequestUri
                }
            }
        }

        $tag = Resolve-IDEOCODEReleaseTagFromUri $resolvedUri
        if ($tag) { return $tag }
    } catch {
        if (-not $metadataTag) {
            Write-Err "Failed to determine latest version: $_"
        }
    }

    if ($metadataTag) {
        Write-Warn "GitHub release lookup unavailable; using cached IDEOCODE.sh metadata ($metadataTag)."
        return $metadataTag
    }
    Write-Err "Failed to determine latest version"
}

function Get-IDEOCODEReleaseDownloadBases([string]$ReleaseTag) {
    $bases = New-Object System.Collections.Generic.List[string]
    try {
        $response = Invoke-WebRequest -UseBasicParsing -Uri "$ReleaseMetadataBase/$ReleaseTag/download-bases"
        foreach ($line in ((ConvertFrom-IDEOCODEWebContent -Content $response.Content) -split "`r?`n")) {
            $candidate = $line.Trim().TrimEnd('/')
            if ($candidate -match '^https://\S+$' -and -not $bases.Contains($candidate)) {
                $bases.Add($candidate)
            }
        }
    } catch {}

    $githubBase = "https://github.com/$Repo/releases/download/$ReleaseTag"
    if (-not $bases.Contains($githubBase)) { $bases.Add($githubBase) }
    return $bases.ToArray()
}

function Get-IDEOCODESha256FromManifest {
    param(
        [Parameter(Mandatory = $true)][string]$ManifestText,
        [Parameter(Mandatory = $true)][string]$AssetName
    )

    foreach ($line in ($ManifestText -split "`r?`n")) {
        if ($line -match '^\s*([0-9a-fA-F]{64})\s+\*?(.+?)\s*$') {
            $candidateName = [System.IO.Path]::GetFileName($Matches[2])
            if ($candidateName -eq $AssetName) {
                return $Matches[1].ToLowerInvariant()
            }
        }
    }

    return $null
}

function Get-ReleaseChecksum([string]$ReleaseTag, [string]$AssetName) {
    $lastError = $null
    foreach ($checksumUrl in @(
        "$ReleaseMetadataBase/$ReleaseTag/SHA256SUMS",
        "https://github.com/$Repo/releases/download/$ReleaseTag/SHA256SUMS"
    )) {
        try {
            $response = Invoke-WebRequest -UseBasicParsing -Uri $checksumUrl
            $expected = Get-IDEOCODESha256FromManifest -ManifestText (ConvertFrom-IDEOCODEWebContent -Content $response.Content) -AssetName $AssetName
            if ($expected) { return $expected }
        } catch {
            $lastError = $_
        }
    }

    if ($lastError) {
        Write-Err "Could not download SHA256SUMS for $ReleaseTag. Refusing to install an unverified download: $lastError"
    }
    Write-Err "SHA256SUMS for $ReleaseTag does not list $AssetName"
}

function Assert-IDEOCODEFileChecksum([string]$FilePath, [string]$ExpectedSha256, [string]$AssetName) {
    try {
        $actual = (Get-FileHash -LiteralPath $FilePath -Algorithm SHA256).Hash.ToLowerInvariant()
    } catch {
        Write-Err "Could not calculate SHA256 for ${AssetName}: $_"
    }

    if ($actual -ne $ExpectedSha256) {
        Remove-Item -LiteralPath $FilePath -Force -ErrorAction SilentlyContinue
        Write-Err "SHA256 verification failed for $AssetName (expected $ExpectedSha256, got $actual)"
    }

    Write-Info "Verified SHA256: $AssetName"
    return $actual
}

function Get-IDEOCODELocalAppDataDir {
    if ($env:LOCALAPPDATA) {
        return $env:LOCALAPPDATA
    }

    $localAppData = [Environment]::GetFolderPath([Environment+SpecialFolder]::LocalApplicationData)
    if ($localAppData) {
        return $localAppData
    }

    if ($env:USERPROFILE) {
        return (Join-Path $env:USERPROFILE "AppData\Local")
    }

    return (Join-Path ([Environment]::GetFolderPath("UserProfile")) "AppData\Local")
}

function Get-DefaultIDEOCODEInstallDir {
    return (Join-Path (Get-IDEOCODELocalAppDataDir) "IDEOCODE\bin")
}

function ConvertTo-IDEOCODEPathKey([string]$PathValue) {
    if (-not $PathValue) {
        return ""
    }

    $clean = [Environment]::ExpandEnvironmentVariables($PathValue.Trim().Trim('"'))
    if (-not $clean) {
        return ""
    }

    try {
        $clean = [System.IO.Path]::GetFullPath($clean)
    } catch {
    }


    $clean = $clean.TrimEnd([System.IO.Path]::DirectorySeparatorChar, [System.IO.Path]::AltDirectorySeparatorChar)
    return $clean.ToUpperInvariant()
}

function Split-IDEOCODEPathList([string]$PathValue) {
    if (-not $PathValue) {
        return @()
    }

    $entries = @()
    foreach ($entry in ($PathValue -split ';')) {
        $clean = $entry.Trim().Trim('"')
        if ($clean) {
            $entries += $clean
        }
    }
    return $entries
}

function Join-IDEOCODEPathList([string[]]$Entries) {
    if (-not $Entries -or $Entries.Count -eq 0) {
        return ""
    }

    return ($Entries -join ';')
}

function Get-IDEOCODEManagedPathKeys([string]$InstallDir) {
    $keys = New-Object 'System.Collections.Generic.HashSet[string]' ([System.StringComparer]::OrdinalIgnoreCase)
    foreach ($candidate in @($InstallDir, (Get-DefaultIDEOCODEInstallDir))) {
        $key = ConvertTo-IDEOCODEPathKey $candidate
        if ($key) {
            [void]$keys.Add($key)
        }
    }
    return $keys
}

function Resolve-IDEOCODEPathUpdate {
    param(
        [Parameter(Mandatory = $true)][string]$InstallDir,
        [AllowNull()][string]$CurrentPath,
        [switch]$RemoveOnly
    )

    $managedKeys = Get-IDEOCODEManagedPathKeys -InstallDir $InstallDir
    $nextEntries = @()
    $removedManaged = 0

    foreach ($entry in (Split-IDEOCODEPathList $CurrentPath)) {
        $key = ConvertTo-IDEOCODEPathKey $entry
        if (-not $key) {
            continue
        }

        if ($managedKeys.Contains($key)) {
            $removedManaged += 1
            continue
        }

        $nextEntries += $entry
    }

    if (-not $RemoveOnly) {
        $nextEntries = @($InstallDir) + $nextEntries
    }

    $nextPath = Join-IDEOCODEPathList $nextEntries
    $changed = ($nextPath -ne ([string]$CurrentPath))

    return [pscustomobject]@{
        Path = $nextPath
        Changed = $changed
        RemovedManagedEntries = $removedManaged
        RemovedDuplicateEntries = 0
        AddedLauncherEntry = (-not $RemoveOnly)
        InstallDir = $InstallDir
    }
}

function Send-IDEOCODEEnvironmentChangedBroadcast {
    if ($env:IDEOCODE_DISABLE_ENV_BROADCAST -eq "1") {
        return $false
    }

    if (-not ("IDEOCODE.EnvironmentBroadcast" -as [type])) {
        Add-Type -TypeDefinition @"
using System;
using System.Runtime.InteropServices;
namespace IDEOCODE {
    public static class EnvironmentBroadcast {
        [DllImport("user32.dll", SetLastError = true, CharSet = CharSet.Auto)]
        public static extern IntPtr SendMessageTimeout(
            IntPtr hWnd,
            UInt32 Msg,
            UIntPtr wParam,
            string lParam,
            UInt32 fuFlags,
            UInt32 uTimeout,
            out UIntPtr lpdwResult);
    }
}
"@
    }

    $result = [UIntPtr]::Zero
    [IDEOCODE.EnvironmentBroadcast]::SendMessageTimeout([IntPtr]0xffff, 0x001A, [UIntPtr]::Zero, "Environment", 0x0002, 5000, [ref]$result) | Out-Null
    return $true
}

function Set-IDEOCODEUserPath {
    param(
        [Parameter(Mandatory = $true)][string]$InstallDir,
        [AllowNull()][string]$CurrentPath,
        [scriptblock]$SetUserPathAction,
        [scriptblock]$BroadcastAction,
        [bool]$Broadcast = $true
    )

    if (-not $PSBoundParameters.ContainsKey('CurrentPath')) {
        $CurrentPath = [Environment]::GetEnvironmentVariable("Path", "User")
    }

    $update = Resolve-IDEOCODEPathUpdate -InstallDir $InstallDir -CurrentPath $CurrentPath
    $broadcasted = $false

    if ($update.Changed) {
        if ($SetUserPathAction) {
            & $SetUserPathAction $update.Path
        } else {
            [Environment]::SetEnvironmentVariable("Path", $update.Path, "User")
        }

        if ($Broadcast) {
            if ($BroadcastAction) {
                & $BroadcastAction | Out-Null
            } else {
                Send-IDEOCODEEnvironmentChangedBroadcast | Out-Null
            }
            $broadcasted = $true
        }
    }

    $update | Add-Member -NotePropertyName Broadcasted -NotePropertyValue $broadcasted
    return $update
}

function Remove-IDEOCODEUserPath {
    param(
        [Parameter(Mandatory = $true)][string]$InstallDir,
        [AllowNull()][string]$CurrentPath,
        [scriptblock]$SetUserPathAction,
        [scriptblock]$BroadcastAction,
        [bool]$Broadcast = $true
    )

    if (-not $PSBoundParameters.ContainsKey('CurrentPath')) {
        $CurrentPath = [Environment]::GetEnvironmentVariable("Path", "User")
    }

    $update = Resolve-IDEOCODEPathUpdate -InstallDir $InstallDir -CurrentPath $CurrentPath -RemoveOnly
    $broadcasted = $false

    if ($update.Changed) {
        if ($SetUserPathAction) {
            & $SetUserPathAction $update.Path
        } else {
            [Environment]::SetEnvironmentVariable("Path", $update.Path, "User")
        }

        if ($Broadcast) {
            if ($BroadcastAction) {
                & $BroadcastAction | Out-Null
            } else {
                Send-IDEOCODEEnvironmentChangedBroadcast | Out-Null
            }
            $broadcasted = $true
        }
    }

    $update | Add-Member -NotePropertyName Broadcasted -NotePropertyValue $broadcasted
    return $update
}

function Set-IDEOCODEProcessPath([string]$InstallDir) {
    $update = Resolve-IDEOCODEPathUpdate -InstallDir $InstallDir -CurrentPath $env:Path
    $env:Path = $update.Path
    return $update
}

function Remove-IDEOCODEStaleLauncherBackups {
    param(
        [Parameter(Mandatory = $true)][string]$LauncherDir
    )

    Get-ChildItem -LiteralPath $LauncherDir -Filter '.IDEOCODE-launcher-old-*.exe' -File -Force -ErrorAction SilentlyContinue |
        Remove-Item -Force -ErrorAction SilentlyContinue
}

function Install-IDEOCODELauncher {
    param(
        [Parameter(Mandatory = $true)][string]$SourcePath,
        [Parameter(Mandatory = $true)][string]$LauncherPath
    )

    $launcherDir = Split-Path -Parent $LauncherPath
    New-Item -ItemType Directory -Path $launcherDir -Force | Out-Null

    $operationId = [guid]::NewGuid().ToString('N')
    $tempLauncher = Join-Path $launcherDir (".IDEOCODE-launcher-{0}.tmp.exe" -f $operationId)
    $oldLauncher = Join-Path $launcherDir (".IDEOCODE-launcher-old-{0}.exe" -f $operationId)
    $movedExistingLauncher = $false
    try {
        Copy-Item -Path $SourcePath -Destination $tempLauncher -Force
        if (Test-Path -LiteralPath $LauncherPath) {
            # Windows will not overwrite a loaded executable, but it does allow
            # the directory entry to be renamed while the process keeps running
            # from its existing file handle. Move the old launcher aside first,
            # then atomically put the new binary at the stable PATH location.
            Move-Item -LiteralPath $LauncherPath -Destination $oldLauncher
            $movedExistingLauncher = $true
        }

        try {
            Move-Item -LiteralPath $tempLauncher -Destination $LauncherPath
        } catch {
            if ($movedExistingLauncher -and -not (Test-Path -LiteralPath $LauncherPath)) {
                Move-Item -LiteralPath $oldLauncher -Destination $LauncherPath
                $movedExistingLauncher = $false
            }
            throw
        }

        if ($movedExistingLauncher) {
            # Removal succeeds immediately for an idle launcher. If an older
            # IDEOCODE process still has the renamed executable loaded, Windows
            # keeps it until that process exits and the next install cleans it.
            Remove-Item -LiteralPath $oldLauncher -Force -ErrorAction SilentlyContinue
        }

        # Only prune backups after the stable path contains the new launcher.
        # Doing this before replacement could delete another concurrent
        # installer's rollback file during its short rename window.
        Remove-IDEOCODEStaleLauncherBackups -LauncherDir $launcherDir
    } finally {
        Remove-Item -LiteralPath $tempLauncher -Force -ErrorAction SilentlyContinue
    }

    return $LauncherPath
}

function Resolve-OptionalPath([string]$PathValue) {
    if (-not $PathValue) {
        return $null
    }

    try {
        return (Resolve-Path -LiteralPath $PathValue -ErrorAction Stop).Path
    } catch {
        Write-Err "Provided path does not exist: $PathValue"
    }
}

function Stop-ProcessTree([int]$ProcessId) {
    try {
        Get-CimInstance Win32_Process -ErrorAction SilentlyContinue |
            Where-Object { $_.ParentProcessId -eq $ProcessId } |
            ForEach-Object { Stop-ProcessTree -ProcessId $_.ProcessId }
    } catch {}

    try {
        Stop-Process -Id $ProcessId -Force -ErrorAction SilentlyContinue
    } catch {}
}

function Invoke-ProcessWithTimeout {
    param(
        [Parameter(Mandatory = $true)][string]$FilePath,
        [string[]]$ArgumentList = @(),
        [Parameter(Mandatory = $true)][int]$TimeoutSeconds,
        [Parameter(Mandatory = $true)][string]$FriendlyName,
        [switch]$CaptureOutput
    )

    $startParams = @{
        FilePath = $FilePath
        ArgumentList = $ArgumentList
        PassThru = $true
        NoNewWindow = $true
    }

    $stdoutPath = $null
    $stderrPath = $null
    if ($CaptureOutput) {
        $stdoutPath = Join-Path $env:TEMP ("IDEOCODE-{0}-{1}-stdout.log" -f $FriendlyName, [guid]::NewGuid().ToString('N'))
        $stderrPath = Join-Path $env:TEMP ("IDEOCODE-{0}-{1}-stderr.log" -f $FriendlyName, [guid]::NewGuid().ToString('N'))
        $startParams.RedirectStandardOutput = $stdoutPath
        $startParams.RedirectStandardError = $stderrPath
    }

    $process = Start-Process @startParams
    # Wait-Process did not gain -Timeout until newer PowerShell releases. Use
    # the underlying .NET Process API so the documented PowerShell 5.1 minimum
    # is real rather than only passing on PowerShell 7.
    $timedOut = -not $process.WaitForExit($TimeoutSeconds * 1000)
    if ($timedOut) {
        Stop-ProcessTree -ProcessId $process.Id
        return [pscustomobject]@{
            TimedOut = $true
            ExitCode = $null
            StdoutPath = $stdoutPath
            StderrPath = $stderrPath
        }
    }

    # Ensure redirected streams have finished flushing before callers inspect
    # their files, then refresh ExitCode from the completed process.
    $process.WaitForExit()
    $process.Refresh()
    return [pscustomobject]@{
        TimedOut = $false
        ExitCode = $process.ExitCode
        StdoutPath = $stdoutPath
        StderrPath = $stderrPath
    }
}

function Write-LogTail([string]$Path, [string]$Label) {
    if (-not $Path -or -not (Test-Path $Path)) {
        return
    }

    $lines = Get-Content -Path $Path -Tail 40 -ErrorAction SilentlyContinue
    if ($lines -and $lines.Count -gt 0) {
        Write-Warn "$Label (last 40 lines):"
        $lines | ForEach-Object { Write-Host $_ }
    }
}

function Test-CommandExists([string]$CommandName) {
    return [bool](Get-Command $CommandName -ErrorAction SilentlyContinue)
}

function Test-AlacrittyInstalled {
    return [bool](Find-AlacrittyPath)
}

function Find-AlacrittyPath {
    $candidates = @(
        "C:\Program Files\Alacritty\alacritty.exe",
        "C:\Program Files (x86)\Alacritty\alacritty.exe"
    )

    if ($env:LOCALAPPDATA) {
        $candidates += (Join-Path $env:LOCALAPPDATA "Microsoft\WinGet\Links\alacritty.exe")
    }

    foreach ($candidate in $candidates) {
        if ($candidate -and (Test-Path $candidate)) {
            return $candidate
        }
    }

    try {
        $command = Get-Command alacritty -ErrorAction Stop
        if ($command -and $command.Source) {
            return $command.Source
        }
    } catch {}

    return $null
}

function Install-Alacritty {
    if (Test-AlacrittyInstalled) {
        Write-Info "Alacritty is already installed"
        return $true
    }

    if (-not (Test-CommandExists "winget")) {
        Write-Warn "winget was not found, so Alacritty could not be installed automatically"
        Write-Warn "Install App Installer / winget from Microsoft, then run: winget install -e --id Alacritty.Alacritty"
        return $false
    }

    Write-Info "Installing Alacritty..."
    $wingetArgs = @(
        "install",
        "-e",
        "--id", "Alacritty.Alacritty",
        "--accept-source-agreements",
        "--accept-package-agreements",
        "--disable-interactivity"
    )

    $wingetResult = Invoke-ProcessWithTimeout -FilePath "winget" -ArgumentList $wingetArgs -TimeoutSeconds 180 -FriendlyName "winget-install"
    if ($wingetResult.TimedOut) {
        Write-Warn "Alacritty install timed out after 180 seconds; skipping automatic setup"
        return $false
    }

    if ($wingetResult.ExitCode -ne 0) {
        Write-Warn "Alacritty install failed (winget exit code: $($wingetResult.ExitCode))"
        return $false
    }

    $alacrittyPath = Find-AlacrittyPath
    if (-not $alacrittyPath) {
        Write-Warn "Alacritty install finished, but alacritty.exe was not found on PATH yet"
        return $false
    }

    Write-Info "Alacritty installed: $alacrittyPath"
    return $true
}

function Stop-IDEOCODEHotkeyListeners {
    try {
        Get-CimInstance Win32_Process -Filter "Name = 'powershell.exe' OR Name = 'pwsh.exe'" -ErrorAction SilentlyContinue |
            Where-Object { $_.CommandLine -like '*IDEOCODE-hotkey*' } |
            ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }
    } catch {}

    try {
        $currentPid = $PID
        Get-CimInstance Win32_Process -Filter "Name = 'IDEOCODE.exe'" -ErrorAction SilentlyContinue |
            Where-Object { $_.ProcessId -ne $currentPid -and $_.CommandLine -like '*--listen-windows-hotkey*' } |
            ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }
    } catch {}
}

function ConvertFrom-IDEOCODEVersionOutput([string]$Output) {
    if (-not $Output) {
        return $null
    }

    # A genuinely fresh profile may print the one-time telemetry notice before
    # the version. When output is captured by PowerShell, terminal control
    # sequences can also leave the final `IDEOCODE v...` on the same logical line.
    if ($Output -match '(?i)\bIDEOCODE\s+v?([0-9][0-9A-Za-z.+-]*)') {
        return "v$($Matches[1])"
    }

    return $null
}

function Get-IDEOCODEVersionFromBinary([string]$BinaryPath) {
    if (-not $BinaryPath -or -not (Test-Path -LiteralPath $BinaryPath)) {
        return $null
    }

    $previousErrorActionPreference = $ErrorActionPreference
    try {
        # Fresh profiles emit the one-time telemetry notice on stderr. Under
        # Windows PowerShell with ErrorActionPreference=Stop, native stderr is
        # promoted to a terminating NativeCommandError even when the process
        # succeeds. Capture both streams without letting that notice abort the
        # version probe.
        $ErrorActionPreference = 'Continue'
        $output = (& $BinaryPath --version 2>&1 | Out-String).Trim()
        $exitCode = $LASTEXITCODE
        if ($exitCode -ne 0) {
            return $null
        }
        return (ConvertFrom-IDEOCODEVersionOutput $output)
    } catch {
        return $null
    } finally {
        $ErrorActionPreference = $previousErrorActionPreference
    }
}

function Assert-IDEOCODEBinaryCandidate {
    param(
        [Parameter(Mandatory = $true)][string]$BinaryPath,
        [Parameter(Mandatory = $true)][string]$ExpectedVersion
    )

    if ($env:IDEOCODE_INSTALL_SKIP_BINARY_VALIDATION -eq "1") {
        return $null
    }

    $reportedVersion = Get-IDEOCODEVersionFromBinary $BinaryPath
    if (-not $reportedVersion) {
        Write-Err "Downloaded IDEOCODE binary could not run '--version'. It may be corrupt, quarantined by antivirus, or built for the wrong architecture."
    }

    $expectedNumber = $ExpectedVersion.TrimStart('v')
    if ($reportedVersion.TrimStart('v') -ne $expectedNumber) {
        Write-Err "Downloaded binary reports $reportedVersion, but the installer requested $ExpectedVersion"
    }

    Write-Info "Validated IDEOCODE binary: $reportedVersion"
    return $reportedVersion
}

function Test-IDEOCODEMsvcBuildToolsAvailable {
    if (Get-Command link.exe -ErrorAction SilentlyContinue) {
        return $true
    }

    $programFilesX86 = [Environment]::GetFolderPath([Environment+SpecialFolder]::ProgramFilesX86)
    if (-not $programFilesX86) {
        return $false
    }

    $vswhere = Join-Path $programFilesX86 "Microsoft Visual Studio\Installer\vswhere.exe"
    if (-not (Test-Path -LiteralPath $vswhere)) {
        return $false
    }

    try {
        $linkPath = & $vswhere -latest -products '*' -requires Microsoft.VisualStudio.Component.VC.Tools.x86.x64 -find 'VC\Tools\MSVC\**\bin\Hostx64\x64\link.exe' 2>$null | Select-Object -First 1
        return [bool]$linkPath
    } catch {
        return $false
    }
}

function Assert-IDEOCODESourceBuildPrerequisites {
    if (-not (Get-Command git -ErrorAction SilentlyContinue)) {
        Write-Err "Git is required for -BuildFromSource. Install it with: winget install -e --id Git.Git"
    }
    if (-not (Get-Command cargo -ErrorAction SilentlyContinue) -or -not (Get-Command rustc -ErrorAction SilentlyContinue)) {
        Write-Err "Rust is required for -BuildFromSource. Install it from https://rustup.rs, then open a new PowerShell window."
    }

    $rustHost = ""
    try {
        $rustHost = (& rustc -vV 2>$null | Select-String '^host:' | Select-Object -First 1).ToString()
    } catch {}

    if ($rustHost -match 'pc-windows-msvc' -and -not (Test-IDEOCODEMsvcBuildToolsAvailable)) {
        Write-Err "The MSVC linker (link.exe) was not found. Install Visual Studio 2022 Build Tools with the 'Desktop development with C++' workload, then open a new PowerShell window before using -BuildFromSource."
    }
}

function Set-SetupHintsState([bool]$AlacrittyConfigured, [bool]$HotkeyConfigured) {
    New-Item -ItemType Directory -Path $IDEOCODEHome -Force | Out-Null

    $state = @{
        launch_count = 0
        hotkey_configured = $HotkeyConfigured
        hotkey_dismissed = $HotkeyConfigured
        alacritty_configured = $AlacrittyConfigured
        alacritty_dismissed = $AlacrittyConfigured
        desktop_shortcut_created = $false
        mac_ghostty_guided = $false
        mac_ghostty_dismissed = $false
    }

    if (Test-Path $SetupHintsPath) {
        try {
            $existing = Get-Content $SetupHintsPath -Raw | ConvertFrom-Json -ErrorAction Stop
            foreach ($property in $existing.PSObject.Properties) {
                $state[$property.Name] = $property.Value
            }
        } catch {
            Write-Warn "Could not read existing setup hints state; overwriting it"
        }
    }

    if ($AlacrittyConfigured) {
        $state.alacritty_configured = $true
        $state.alacritty_dismissed = $true
    }

    if ($HotkeyConfigured) {
        $state.hotkey_configured = $true
        $state.hotkey_dismissed = $true
    }

    $state | ConvertTo-Json | Set-Content -Path $SetupHintsPath -Encoding UTF8
}

function Get-IDEOCODEHotkeyShortcutScript([string]$StartupShortcutPath, [string]$IDEOCODEExePath) {
    $escapedShortcutPath = $StartupShortcutPath.Replace("'", "''")
    $escapedExePath = $IDEOCODEExePath.Replace("'", "''")
    $listenerArguments = "-NoProfile -ExecutionPolicy RemoteSigned -WindowStyle Hidden -Command `"& '$escapedExePath' setup-hotkey --listen-windows-hotkey`""
    $escapedListenerArguments = $listenerArguments.Replace("'", "''")
    $shortcutLines = @(
        '$ErrorActionPreference = ''Stop''',
        '$shell = New-Object -ComObject WScript.Shell',
        "`$shortcut = `$shell.CreateShortcut('$escapedShortcutPath')",
        "`$shortcut.TargetPath = 'powershell.exe'",
        "`$shortcut.Arguments = '$escapedListenerArguments'",
        "`$shortcut.Description = 'IDEOCODE global launch hotkey listener'",
        '$shortcut.WindowStyle = 7',
        '$shortcut.Save()',
        "Write-Output 'OK'"
    )
    return ($shortcutLines -join "`r`n")
}

function Install-IDEOCODEHotkey([string]$IDEOCODEExePath) {
    New-Item -ItemType Directory -Path $HotkeyDir -Force | Out-Null
    $skipProcessLifecycle = (
        $env:IDEOCODE_WINDOWS_SETUP_SKIP_EXTERNALS -eq "1" -or
        $env:IDEOCODE_WINDOWS_SETUP_SKIP_PROCESS_LIFECYCLE -eq "1"
    )
    if (-not $skipProcessLifecycle) {
        Stop-IDEOCODEHotkeyListeners
    }

    # Upgrade cleanup: v0.47 and earlier wrote a generated PowerShell listener.
    # The first-party listener now lives in IDEOCODE.exe itself and is launched via
    # `IDEOCODE setup-hotkey --listen-windows-hotkey` from a login shortcut.
    Remove-Item -Path (Join-Path $HotkeyDir "IDEOCODE-hotkey.ps1") -Force -ErrorAction SilentlyContinue
    Remove-Item -Path (Join-Path $HotkeyDir "IDEOCODE-hotkey-launcher.vbs") -Force -ErrorAction SilentlyContinue
    $startupDir = Join-Path $env:APPDATA "Microsoft\Windows\Start Menu\Programs\Startup"
    New-Item -ItemType Directory -Path $startupDir -Force | Out-Null
    $startupShortcutPath = Join-Path $startupDir "IDEOCODE-hotkey.lnk"
    $shortcutScript = Get-IDEOCODEHotkeyShortcutScript -StartupShortcutPath $startupShortcutPath -IDEOCODEExePath $IDEOCODEExePath

    if ($env:IDEOCODE_WINDOWS_SETUP_SKIP_EXTERNALS -eq "1") {
        Set-Content -Path (Join-Path $HotkeyDir "IDEOCODE-hotkey-shortcut.ps1") -Value $shortcutScript -Encoding UTF8
        Write-Info "Configured Alt+; and the Copilot key to launch IDEOCODE"
        return $true
    }

    $shortcutOutput = & powershell -NoProfile -Command $shortcutScript
    if ($LASTEXITCODE -ne 0 -or -not ($shortcutOutput -match 'OK')) {
        Write-Warn "Created hotkey files, but could not create the Startup shortcut"
        return $false
    }

    $escapedExePath = $IDEOCODEExePath.Replace("'", "''")
    $launchHotkeyCommand = "Start-Process -FilePath '$escapedExePath' -ArgumentList @('setup-hotkey', '--listen-windows-hotkey') -WindowStyle Hidden"
    if (-not $skipProcessLifecycle) {
        & powershell -NoProfile -ExecutionPolicy RemoteSigned -WindowStyle Hidden -Command $launchHotkeyCommand | Out-Null
        if ($LASTEXITCODE -ne 0) {
            Write-Warn "Hotkey will start on next login, but could not be launched immediately"
        }
    }

    Write-Info "Configured Alt+; and the Copilot key to launch IDEOCODE"
    return $true
}
function Resolve-IDEOCODEWindowsArtifact([string[]]$ArchitectureCandidates) {
    $sawX64 = $false

    foreach ($arch in @($ArchitectureCandidates)) {
        if (-not $arch) { continue }
        switch -Regex ($arch.Trim()) {
            '^(Arm64|ARM64|AARCH64|aarch64)$' { return "IDEOCODE-windows-aarch64" }
            '^(X64|AMD64|x86_64)$' { $sawX64 = $true }
        }
    }

    if ($sawX64) { return "IDEOCODE-windows-x86_64" }
    return $null
}

function Get-IDEOCODEWindowsArtifact {
    $candidates = @()

    try {
        $runtimeArch = [System.Runtime.InteropServices.RuntimeInformation]::OSArchitecture
        if ($runtimeArch) { $candidates += [string]$runtimeArch }
    } catch {}

    foreach ($envArch in @($env:PROCESSOR_ARCHITECTURE, $env:PROCESSOR_ARCHITEW6432)) {
        if ($envArch) { $candidates += [string]$envArch }
    }

    $artifact = Resolve-IDEOCODEWindowsArtifact $candidates
    if ($artifact) { return $artifact }

    $displayArch = if ($candidates.Count -gt 0) { $candidates -join ", " } else { "<unknown>" }
    Write-Err "Unsupported architecture: $displayArch (supported: x86_64, ARM64)"
}

function Invoke-IDEOCODEInstall {
$Artifact = Get-IDEOCODEWindowsArtifact

$ResolvedArtifactExePath = Resolve-OptionalPath $ArtifactExePath
$ResolvedArtifactTgzPath = Resolve-OptionalPath $ArtifactTgzPath

if ($ResolvedArtifactExePath -and $ResolvedArtifactTgzPath) {
    Write-Err "Provide only one of -ArtifactExePath or -ArtifactTgzPath"
}

if (-not $Version) {
    if ($ResolvedArtifactExePath) {
        $Version = Get-IDEOCODEVersionFromBinary $ResolvedArtifactExePath
        if (-not $Version) {
            Write-Err "Could not detect a IDEOCODE version from '$ResolvedArtifactExePath'. Pass -Version explicitly if this is a trusted local build."
        }
        Write-Info "Detected local artifact version: $Version"
    } elseif ($ResolvedArtifactTgzPath) {
        Write-Err "-Version is required when using -ArtifactTgzPath"
    } else {
        Write-Info "Fetching latest release..."
        $Version = Get-LatestIDEOCODEReleaseTag
    }
}

if (-not $Version) { Write-Err "Failed to determine latest version" }

$VersionNum = $Version.TrimStart('v')
$DownloadBases = Get-IDEOCODEReleaseDownloadBases $Version

$BuildsDir = Join-Path (Get-IDEOCODELocalAppDataDir) "IDEOCODE\builds"
$StableDir = Join-Path $BuildsDir "stable"
$VersionDir = Join-Path $BuildsDir "versions\$VersionNum"
$LauncherPath = Join-Path $InstallDir "IDEOCODE.exe"

$Existing = ""
if (Test-Path $LauncherPath) {
    try { $Existing = & $LauncherPath --version 2>$null | Select-Object -First 1 } catch {}
}

if ($Existing) {
    if ($Existing -match [regex]::Escape($VersionNum)) {
        Write-Info "IDEOCODE $Version is already installed - reinstalling"
    } else {
        Write-Info "Updating IDEOCODE $Existing -> $Version"
    }
} else {
    Write-Info "Installing IDEOCODE $Version"
}
Write-Info "  launcher: $LauncherPath"

foreach ($d in @($InstallDir, $StableDir, $VersionDir)) {
    if (-not (Test-Path $d)) { New-Item -ItemType Directory -Path $d -Force | Out-Null }
}

$TempDir = Join-Path $env:TEMP "IDEOCODE-install-$(Get-Random)"
New-Item -ItemType Directory -Path $TempDir -Force | Out-Null

try {
$DownloadMode = ""
$DownloadPath = Join-Path $TempDir "IDEOCODE.download"
$DownloadedAssetName = $null

if ($ResolvedArtifactExePath) {
    Write-Info "Using local artifact exe: $ResolvedArtifactExePath"
    Copy-Item -Path $ResolvedArtifactExePath -Destination $DownloadPath -Force
    $DownloadMode = "bin"
} elseif ($ResolvedArtifactTgzPath) {
    Write-Info "Using local artifact archive: $ResolvedArtifactTgzPath"
    Copy-Item -Path $ResolvedArtifactTgzPath -Destination $DownloadPath -Force
    $DownloadMode = "tar"
} else {
    foreach ($candidate in @(
        @{ Name = "$Artifact.exe"; Mode = "bin" },
        @{ Name = "$Artifact.tar.gz"; Mode = "tar" }
    )) {
        foreach ($base in $DownloadBases) {
            try {
                Write-Info "Downloading $($candidate.Name) from $base..."
                Invoke-WebRequest -UseBasicParsing -Uri "$base/$($candidate.Name)" -OutFile $DownloadPath
                $DownloadMode = $candidate.Mode
                $DownloadedAssetName = $candidate.Name
                break
            } catch {}
        }
        if ($DownloadMode) { break }
    }
}

if (-not $ResolvedArtifactExePath -and -not $ResolvedArtifactTgzPath -and $DownloadMode) {
    $downloadedAssetName = if ($DownloadMode -eq "bin") { "$Artifact.exe" } else { "$Artifact.tar.gz" }
    $expectedSha256 = Get-ReleaseChecksum -ReleaseTag $Version -AssetName $downloadedAssetName
    Assert-IDEOCODEFileChecksum -FilePath $DownloadPath -ExpectedSha256 $expectedSha256 -AssetName $downloadedAssetName | Out-Null
}

$DestBin = Join-Path $VersionDir "IDEOCODE.exe"

if ($DownloadMode -eq "tar") {
    Write-Info "Extracting..."
    tar xzf $DownloadPath -C $TempDir 2>$null
    $SrcBin = Join-Path $TempDir "$Artifact.exe"
    if (-not (Test-Path $SrcBin)) {
        Write-Err "Downloaded archive did not contain expected binary: $Artifact.exe"
    }
    Move-Item -Path $SrcBin -Destination $DestBin -Force
} elseif ($DownloadMode -eq "bin") {
    Move-Item -Path $DownloadPath -Destination $DestBin -Force
} else {
    if (-not $BuildFromSource) {
        $releaseUrl = "https://github.com/$Repo/releases/tag/$Version"
        Write-Err "No prebuilt $Artifact asset was found in $Version. Check $releaseUrl or rerun the downloaded script with -BuildFromSource. The installer will not start a long source build automatically."
    }

    Write-Info "No prebuilt asset found for $Artifact in $Version; -BuildFromSource was requested"
    Assert-IDEOCODESourceBuildPrerequisites

    $SrcDir = Join-Path $TempDir "IDEOCODE-src"
    Write-Info "Cloning $Repo at $Version..."
    $gitCloneResult = Invoke-ProcessWithTimeout -FilePath "git" -ArgumentList @(
        "clone",
        "--depth", "1",
        "--branch", $Version,
        "https://github.com/$Repo.git",
        $SrcDir
    ) -TimeoutSeconds 600 -FriendlyName "git-clone" -CaptureOutput
    if ($gitCloneResult.TimedOut) {
        Write-LogTail -Path $gitCloneResult.StdoutPath -Label "git stdout"
        Write-LogTail -Path $gitCloneResult.StderrPath -Label "git stderr"
        Write-Err "git clone timed out after 600 seconds"
    }
    if ($gitCloneResult.ExitCode -ne 0) {
        Write-LogTail -Path $gitCloneResult.StdoutPath -Label "git stdout"
        Write-LogTail -Path $gitCloneResult.StderrPath -Label "git stderr"
        Write-Err "Failed to clone $Repo at $Version (exit code: $($gitCloneResult.ExitCode))"
    }

    Write-Info "Building IDEOCODE from source (this can take several minutes)..."
    $cargoResult = Invoke-ProcessWithTimeout -FilePath "cargo" -ArgumentList @(
        "build", "--release", "--locked", "-p", "IDEOCODE", "--bin", "IDEOCODE",
        "--manifest-path", (Join-Path $SrcDir "Cargo.toml")
    ) -TimeoutSeconds 1800 -FriendlyName "cargo-build" -CaptureOutput
    if ($cargoResult.TimedOut) {
        Write-LogTail -Path $cargoResult.StdoutPath -Label "cargo stdout"
        Write-LogTail -Path $cargoResult.StderrPath -Label "cargo stderr"
        Write-Err "cargo build timed out after 1800 seconds"
    }
    if ($cargoResult.ExitCode -ne 0) {
        Write-LogTail -Path $cargoResult.StdoutPath -Label "cargo stdout"
        Write-LogTail -Path $cargoResult.StderrPath -Label "cargo stderr"
        Write-Err "cargo build failed (exit code: $($cargoResult.ExitCode))"
    }

    $BuiltBin = Join-Path $SrcDir "target\release\IDEOCODE.exe"
    if (-not (Test-Path $BuiltBin)) { Write-Err "Built binary not found at $BuiltBin" }
    Copy-Item -Path $BuiltBin -Destination $DestBin -Force
}

Assert-IDEOCODEBinaryCandidate -BinaryPath $DestBin -ExpectedVersion $Version | Out-Null

$StableBin = Join-Path $StableDir "IDEOCODE.exe"
Copy-Item -Path $DestBin -Destination $StableBin -Force
Set-Content -Path (Join-Path $BuildsDir "stable-version") -Value $VersionNum
Install-IDEOCODELauncher -SourcePath $StableBin -LauncherPath $LauncherPath | Out-Null
} finally {
    Remove-Item -Path $TempDir -Recurse -Force -ErrorAction SilentlyContinue
}

# Gracefully reload any running background server onto the freshly installed
# binary (issue #291). `server reload` only reloads a genuinely-older daemon,
# hands its live sessions to the new process, and is a no-op when nothing is
# running, so it is safe to call unconditionally. Best-effort: never fail the
# install over it.
if ($env:IDEOCODE_SKIP_SERVER_RELOAD -ne "1") {
    try {
        & $LauncherPath server reload 2>$null | Out-Null
    } catch {
    }
}

$userPathUpdate = Set-IDEOCODEUserPath -InstallDir $InstallDir
if ($userPathUpdate.Changed) {
    Write-Info "Updated user PATH with $InstallDir"
    if ($userPathUpdate.RemovedManagedEntries -gt 0 -or $userPathUpdate.RemovedDuplicateEntries -gt 0) {
        Write-Info "  removed $($userPathUpdate.RemovedManagedEntries) stale IDEOCODE PATH entr$(if ($userPathUpdate.RemovedManagedEntries -eq 1) { 'y' } else { 'ies' }) and $($userPathUpdate.RemovedDuplicateEntries) duplicate entr$(if ($userPathUpdate.RemovedDuplicateEntries -eq 1) { 'y' } else { 'ies' })"
    }
} else {
    Write-Info "User PATH already contains $InstallDir"
}

Set-IDEOCODEProcessPath -InstallDir $InstallDir | Out-Null

$installedAlacritty = $false
$configuredHotkey = $false
$shouldSetupAlacritty = [bool]($ConfigureAlacritty -and -not $SkipAlacrittySetup)
$shouldSetupHotkey = [bool]($ConfigureHotkey -and -not $SkipHotkeySetup)

if ($ConfigureAlacritty -and $SkipAlacrittySetup) {
    Write-Warn "Both -ConfigureAlacritty and -SkipAlacrittySetup were provided; skipping Alacritty setup"
}
if ($ConfigureHotkey -and $SkipHotkeySetup) {
    Write-Warn "Both -ConfigureHotkey and -SkipHotkeySetup were provided; skipping hotkey setup"
}

if ($shouldSetupAlacritty) {
    $installedAlacritty = Install-Alacritty
} else {
    $installedAlacritty = Test-AlacrittyInstalled
    Write-Info "Optional Alacritty setup not requested"
}

if ($shouldSetupHotkey) {
    $configuredHotkey = Install-IDEOCODEHotkey -IDEOCODEExePath $LauncherPath
} else {
    Write-Info "Optional global hotkey setup not requested"
}

Set-SetupHintsState -AlacrittyConfigured:(Test-AlacrittyInstalled) -HotkeyConfigured:$configuredHotkey

Write-Host ""
Write-Info "IDEOCODE $Version installed successfully!"
Write-Host ""

if (Test-AlacrittyInstalled) {
    $alacrittyPath = Find-AlacrittyPath
    if ($alacrittyPath) {
        Write-Info "Alacritty ready: $alacrittyPath"
    }
}

if ($configuredHotkey) {
    Write-Info "Global launch keys ready: Alt+; and the Copilot key open IDEOCODE"
    Write-Host ""
} elseif (-not $ConfigureHotkey) {
    Write-Info "Optional: run 'IDEOCODE setup-hotkey' to configure global launch hotkeys and terminal preferences."
    Write-Host ""
}

if (Get-Command IDEOCODE -ErrorAction SilentlyContinue) {
    Write-Info "Run 'IDEOCODE' to get started."
} else {
    Write-Host "  Open a new terminal window, then run:"
    Write-Host ""
    Write-Host "    IDEOCODE" -ForegroundColor Green
}
}

if ($env:IDEOCODE_INSTALL_PS1_IMPORT_ONLY -ne "1") {
    Invoke-IDEOCODEInstall
}
