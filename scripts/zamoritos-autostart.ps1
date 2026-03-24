# zamoritos-autostart.ps1
# Registrar en Task Scheduler de Windows para que arranque con la sesión
# Ejecutar UNA SOLA VEZ como Administrador:
#   powershell -ExecutionPolicy Bypass -File zamoritos-autostart.ps1

$action = New-ScheduledTaskAction `
    -Execute "wsl.exe" `
    -Argument "-d Debian -- bash -c 'sudo systemctl start zamoritos.service'"

$trigger = New-ScheduledTaskTrigger -AtLogOn

$settings = New-ScheduledTaskSettingsSet `
    -ExecutionTimeLimit (New-TimeSpan -Minutes 5) `
    -RestartCount 2 `
    -RestartInterval (New-TimeSpan -Minutes 1)

Register-ScheduledTask `
    -TaskName "Zamoritos – Autostart" `
    -Action $action `
    -Trigger $trigger `
    -Settings $settings `
    -RunLevel Highest `
    -Force

Write-Host "Tarea registrada. Se ejecutará al iniciar sesión en Windows."
