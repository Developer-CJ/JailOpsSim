# Verification devices on Windows

Target devices supplied by the owner: **DigitalPersona U.are.U 4500 (WBF)** and **MSR213U-12AUBNR**. Keep the installed WBF driver. The website, its Node server, and the USB workstation can be different machines. USB access happens at the workstation.

## U.are.U 4500: Windows staff verification

The included `devices/wbf-bridge` is a .NET 10 Windows workstation application using `WinBioOpenSession` / `WinBioVerify` from Windows Biometric Framework. It verifies the current Windows user's enrolled fingerprint. It does not enroll juvenile residents, match resident templates, or read Windows Hello PINs. Windows system-pool enrollment and device access must be supported by the installed driver and Windows edition/policy. Windows Server may require the biometric feature/service, and some Enhanced Sign-in Security configurations restrict system-pool access. A driver working for Windows sign-in does not establish that these API calls will work on every workstation.

1. Keep the WBF driver. Confirm that the **Windows Biometric Service** runs and the staff member can enroll/use a fingerprint in Windows. Run the bridge interactively as that enrolled Windows user, not as LocalSystem or an unattended server task.
2. The Windows ZIP includes a self-contained `devices/wbf-bridge/publish/JailOps.WbfBridge.exe`; no .NET installation is needed to run it on a supported Windows workstation (Windows 10 1809+/Windows 11 or Windows Server 2019+). To rebuild from source, install the .NET 10 SDK and run:

   ```powershell
   dotnet publish devices/wbf-bridge/JailOps.WbfBridge.csproj -c Release -r win-x64 --self-contained true -p:PublishSingleFile=true -p:IncludeNativeLibrariesForSelfExtract=true -o devices/wbf-bridge/publish
   ```

3. Generate a strong shared secret locally. Set `FINGERPRINT_BRIDGE_KEY` on the Node server in its private `.env`, and set the same value in the workstation bridge process environment. Never put it in frontend code or source control.
4. Configure the bridge process. Replace the examples with your actual origin and authenticated JailOps staff username:

   ```powershell
   $env:JAILOPS_ORIGIN = 'https://jailops.example.org'
   $env:JAILOPS_OPERATOR = 'staff.username'
   # Set FINGERPRINT_BRIDGE_KEY through your secure local configuration.
   .\devices\wbf-bridge\publish\JailOps.WbfBridge.exe
   ```

5. Restart Node after setting its key. Open **Workflow desk → Verification devices**. Configured means the secret is present, not that USB access has been tested.
6. At an identity question, select **Fingerprint**, document the resident's two identifiers and source, and select **Verify staff fingerprint**. Touch the enrolled finger within the 60-second challenge period. A result is recorded as **staff WBF fingerprint plus resident check**, never as a resident fingerprint match.

The browser connects only to `http://127.0.0.1:17443/verify`. The server's CSP allows that exact loopback origin. The bridge accepts requests only from the configured website origin, serves no arbitrary HTTP endpoints, permits one WBF operation at a time, and rejects replayed or expired challenges. Chromium may require local-network access permission; managed browser policies can prevent loopback access. Use an HTTPS application origin for remote deployment. Do not bind the bridge to a public interface. One bridge process is bound to one JailOps staff username; configure it only on a trusted staff workstation.

The server issues a nonce bound to workflow, resident/draft, authenticated staff username, and expiry. The bridge performs WBF verification and signs the following UTF-8 bytes with HMAC-SHA256; lowercase hex is returned as `signature`:

```text
<nonce>\n<subject>\n<operator>\nstaff-wbf-matched
```

The line separators above represent actual newline characters, with no trailing newline. The browser never receives the signing key. The Node server verifies the assertion and issues a two-minute single-use proof, consumed in the workspace transaction. Fingerprint images and templates are never sent to Node or the browser.

**Validation boundary:** API tests exercise assertion tampering, expiry, workflow binding, operator binding, and replay protection. The bridge is compiled and cross-published as a self-contained Windows x64 executable. HTTP smoke checks verified origin restrictions, preflight, staff binding, unavailable-WBF failure without a signature, and nonce replay rejection. Native WBF calls and physical-reader operation remain to be validated on the owner's Windows workstation. Resident biometric matching would require a separate compatible enrollment/matching integration; changing the existing WBF driver is not part of this release.

## MSR213U-12AUBNR: facility identifier matching

Use the reader's manufacturer configuration utility to enable **keyboard/wedge output** with an **Enter suffix**. Exact utility commands and firmware capabilities have not been verified for this physical unit; if it enumerates as serial/HID-only rather than a keyboard, it requires a vendor-specific transport adapter. No unverified USB commands are sent.

Use facility-issued cards with a dedicated identifier of 4–120 characters consisting only of letters, digits, dot, underscore, colon, or hyphen. Configure track selection/output stripping to emit that identifier alone. The application rejects payment-card sentinel/separator formats and does not parse payment tracks. This is a facility card identity lookup, not card cryptographic authentication; a cloned/retyped identifier can match and must still be checked against the person.

1. As an administrator, open **Verification devices** and choose a resident.
2. Focus **Scan facility identifier**, swipe the facility card, then enroll it. The server stores only a keyed digest plus resident mapping, outside the shared workspace snapshot.
3. During an existing resident workflow, select **Facility card**, scan into the masked input, and verify. Only a card mapped to that selected resident passes. Use a manual check for first-time intake before a resident record exists.
4. Revoke identifiers from the same admin panel when replaced or withdrawn. A full demo reset also removes reader mappings and pending proofs.

The keyed digest secret is `data/reader-key`. Preserve this file along with `jailops.sqlite` when backing up or upgrading. The backup CLI and Windows Backup.ps1 also write `<destination>.reader-key` when a key exists. Restore that companion as `data/reader-key` alongside the database. A database-only copy needs the same key to use existing cards. Templates remain in Windows and require Windows's own enrollment/recovery process. No default reader keys or production credentials ship in the package.
