<?php
// This is a test file to demonstrate the security scanner.
// The scanner looks for 'eval', so this file should be flagged.
eval("echo 'I am a simulated threat';");
?>