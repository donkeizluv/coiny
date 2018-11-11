Option Explicit

Dim r : r = MsgBox("Open this transaction?", 1, WScript.Arguments(0) & " - $" & WScript.Arguments(1))
If r = 1 Then
    Dim wsh
    Set wsh=WScript.CreateObject("WScript.Shell")
    wsh.Run WScript.Arguments(2)
End If
WScript.Quit 3