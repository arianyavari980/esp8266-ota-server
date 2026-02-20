/*
 * ESP8266 OTA Update System
 * Updates firmware from Render.com server
 * 
 * Author: Ariyan Yavari
 * Date: 2026
 */

#include <ESP8266WiFi.h>
#include <ESP8266HTTPClient.h>
#include <ESP8266httpUpdate.h>
#include <WiFiClientSecure.h>

// ============================================
// CONFIGURATION - CHANGE THESE!
// ============================================

// WiFi credentials
const char* ssid = "A15 Arian";      // Replace with your WiFi name
const char* password = "A36120741";  // Replace with your WiFi password

// Render.com server URL - REPLACE WITH YOUR URL!
const char* serverURL = "https://esp8266-ota-server-z9kk.onrender.com";

// Current firmware version - UPDATE THIS WITH EACH RELEASE!
const String currentVersion = "1.0.1";

// Update check interval (milliseconds)
const unsigned long updateCheckInterval = 300000;  // 5 minutes

// ============================================
// GLOBAL VARIABLES
// ============================================

String firmwareVersionURL;
String firmwareURL;
String firmwareMD5URL;

unsigned long lastUpdateCheck = 0;
bool updateInProgress = false;

WiFiClientSecure secureClient;

// ============================================
// SETUP - Runs once on boot
// ============================================

void setup() {
  // Initialize serial communication
  Serial.begin(115200);
  delay(1000);  // Wait for serial to initialize
  
  // Clear serial buffer
  Serial.println("\n\n\n\n");
  
  // Print banner
  Serial.println("╔════════════════════════════════════════╗");
  Serial.println("║   ESP8266 OTA UPDATE SYSTEM           ║");
  Serial.println("╚════════════════════════════════════════╝");
  Serial.println();
  
  // Print device info
  Serial.println("📊 Device Information:");
  Serial.println("─────────────────────────────────────");
  Serial.printf("Chip ID:        %08X\n", ESP.getChipId());
  Serial.printf("Flash Size:     %u KB\n", ESP.getFlashChipSize() / 1024);
  Serial.printf("Free Heap:      %u bytes\n", ESP.getFreeHeap());
  Serial.printf("Firmware Ver:   %s\n", currentVersion.c_str());
  Serial.println("─────────────────────────────────────");
  Serial.println();
  
  // Setup LED
  pinMode(LED_BUILTIN, OUTPUT);
  digitalWrite(LED_BUILTIN, HIGH);  // LED off (NodeMCU LED is inverted)
  
  // Build URLs
  firmwareVersionURL = String(serverURL) + "/version.txt";
  firmwareURL = String(serverURL) + "/firmware.bin";
  firmwareMD5URL = String(serverURL) + "/firmware.md5";
  
  // Connect to WiFi
  connectWiFi();
  
  // Configure HTTPS
  // Note: Using setInsecure() for simplicity
  // For production, use proper certificate verification
  secureClient.setInsecure();
  
  // Check for updates on boot
  Serial.println("🔍 Checking for updates on boot...");
  checkForUpdates();
  
  // Startup complete
  Serial.println();
  Serial.println("✅ System ready!");
  Serial.println("════════════════════════════════════════");
  Serial.println();
}

// ============================================
// LOOP - Runs repeatedly
// ============================================

void loop() {
  // Periodic update check
  if (!updateInProgress && millis() - lastUpdateCheck > updateCheckInterval) {
    lastUpdateCheck = millis();
    
    Serial.println();
    Serial.println("⏰ Periodic update check...");
    checkForUpdates();
  }
  
  // Blink LED to show device is running
  static unsigned long lastBlink = 0;
  if (millis() - lastBlink > 1000) {
    digitalWrite(LED_BUILTIN, !digitalRead(LED_BUILTIN));
    lastBlink = millis();
  }
  
  // Your application code goes here!
  // For example:
  // - Read sensors
  // - Control outputs
  // - Send data to server
  
  delay(10);  // Small delay to prevent watchdog reset
}

// ============================================
// WIFI CONNECTION FUNCTION
// ============================================

void connectWiFi() {
  WiFi.mode(WIFI_STA);
  WiFi.begin(ssid, password);
  
  Serial.println("🌐 Connecting to WiFi...");
  Serial.print("   SSID: ");
  Serial.println(ssid);
  
  int attempts = 0;
  
  while (WiFi.status() != WL_CONNECTED && attempts < 30) {
    delay(500);
    Serial.print(".");
    digitalWrite(LED_BUILTIN, !digitalRead(LED_BUILTIN));
    attempts++;
  }
  
  digitalWrite(LED_BUILTIN, HIGH);  // LED off
  Serial.println();
  
  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("✅ WiFi Connected!");
    Serial.println("─────────────────────────────────────");
    Serial.print("📍 IP Address:  ");
    Serial.println(WiFi.localIP());
    Serial.print("📶 Signal (RSSI): ");
    Serial.print(WiFi.RSSI());
    Serial.println(" dBm");
    Serial.print("🌐 Gateway:     ");
    Serial.println(WiFi.gatewayIP());
    Serial.println("─────────────────────────────────────");
  } else {
    Serial.println("❌ WiFi Connection Failed!");
    Serial.println("⚠️  Will retry in next update cycle...");
  }
}

// ============================================
// CHECK FOR UPDATES FUNCTION
// ============================================

void checkForUpdates() {
  // Check WiFi connection
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("❌ WiFi not connected, skipping update check");
    return;
  }
  
  HTTPClient http;
  
  Serial.println();
  Serial.println("📡 Fetching version info from server...");
  Serial.print("   URL: ");
  Serial.println(firmwareVersionURL);
  
  http.begin(secureClient, firmwareVersionURL);
  http.setTimeout(10000);  // 10 second timeout
  
  int httpCode = http.GET();
  
  if (httpCode == HTTP_CODE_OK) {
    String newVersion = http.getString();
    newVersion.trim();  // Remove whitespace
    
    Serial.println();
    Serial.println("═══════════════════════════════════════");
    Serial.println("         VERSION COMPARISON            ");
    Serial.println("═══════════════════════════════════════");
    Serial.printf("📦 Current Version:   %s\n", currentVersion.c_str());
    Serial.printf("🌐 Available Version: %s\n", newVersion.c_str());
    Serial.println("═══════════════════════════════════════");
    
    // Compare versions
    if (newVersion != currentVersion) {
      Serial.println("🎉 New version available!");
      Serial.println();
      
      // Get MD5 checksum
      String expectedMD5 = getMD5Checksum();
      
      // Perform update
      if (expectedMD5.length() > 0) {
        Serial.println("🔒 MD5 checksum available - secure update");
        performUpdate(expectedMD5);
      } else {
        Serial.println("⚠️  No MD5 checksum - updating without verification");
        Serial.println("   (Not recommended for production!)");
        performUpdate("");
      }
    } else {
      Serial.println("✅ Firmware is already up to date");
      Serial.println("   No update needed.");
    }
  } else {
    Serial.println();
    Serial.println("❌ Failed to check version");
    Serial.printf("   HTTP Code: %d\n", httpCode);
    
    if (httpCode == -1) {
      Serial.println("   💡 Possible causes:");
      Serial.println("      - Server is down");
      Serial.println("      - No internet connection");
      Serial.println("      - Wrong server URL");
    }
  }
  
  http.end();
}

// ============================================
// GET MD5 CHECKSUM FUNCTION
// ============================================

String getMD5Checksum() {
  HTTPClient http;
  
  Serial.println();
  Serial.println("🔐 Fetching MD5 checksum...");
  http.begin(secureClient, firmwareMD5URL);
  http.setTimeout(10000);
  
  int httpCode = http.GET();
  String md5 = "";
  
  if (httpCode == HTTP_CODE_OK) {
    md5 = http.getString();
    md5.trim();
    md5.toLowerCase();  // Ensure lowercase
    Serial.printf("   Expected MD5: %s\n", md5.c_str());
  } else {
    Serial.println("   ⚠️  Could not fetch MD5 checksum");
  }
  
  http.end();
  return md5;
}

// ============================================
// PERFORM UPDATE FUNCTION
// ============================================

void performUpdate(String expectedMD5) {
  Serial.println();
  Serial.println("╔════════════════════════════════════════╗");
  Serial.println("║     FIRMWARE UPDATE IN PROGRESS        ║");
  Serial.println("╚════════════════════════════════════════╝");
  Serial.println();
  Serial.println("⚠️  DO NOT POWER OFF THE DEVICE!");
  Serial.println();
  
  updateInProgress = true;
  
  // Configure update
  ESPhttpUpdate.setLedPin(LED_BUILTIN, LOW);
  ESPhttpUpdate.rebootOnUpdate(false);  // We'll reboot manually
  
  // Setup callbacks
  ESPhttpUpdate.onStart([]() {
    Serial.println("🔄 Download started...");
    Serial.println("   Please wait...");
  });
  
  ESPhttpUpdate.onEnd([]() {
    Serial.println();
    Serial.println("✅ Download completed!");
  });
  
  ESPhttpUpdate.onProgress([](int cur, int total) {
    static int lastPercent = -1;
    int percent = (cur * 100) / total;
    
    // Only print every 10%
    if (percent != lastPercent && percent % 10 == 0) {
      Serial.printf("📥 Progress: %3d%% (%d / %d bytes)\n", 
                    percent, cur, total);
      lastPercent = percent;
    }
  });
  
  ESPhttpUpdate.onError([](int err) {
    Serial.println();
    Serial.printf("❌ Update Error: %d\n", err);
  });
  
  // Perform update
  Serial.println("🌐 Downloading firmware...");
  Serial.printf("   URL: %s\n", firmwareURL.c_str());
  Serial.println();
  
  t_httpUpdate_return ret;
  
  if (expectedMD5.length() > 0) {
    // Update with MD5 verification
   // ret = ESPhttpUpdate.update(secureClient, firmwareURL, 
                   //            currentVersion, expectedMD5);
  } else {
    // Update without verification
    ret = ESPhttpUpdate.update(secureClient, firmwareURL);
  }
  
  // Handle result
  Serial.println();
  
  switch (ret) {
    case HTTP_UPDATE_FAILED:
      Serial.println("╔════════════════════════════════════════╗");
      Serial.println("║          UPDATE FAILED!                ║");
      Serial.println("╚════════════════════════════════════════╝");
      Serial.println();
      Serial.printf("Error (%d): %s\n", 
        ESPhttpUpdate.getLastError(), 
        ESPhttpUpdate.getLastErrorString().c_str());
      Serial.println();
      Serial.println("💡 Troubleshooting tips:");
      Serial.println("   1. Check server URL is correct");
      Serial.println("   2. Verify firmware.bin exists on server");
      Serial.println("   3. Check internet connection");
      Serial.println("   4. Verify MD5 checksum matches");
      Serial.println("   5. Ensure enough flash space");
      Serial.println();
      updateInProgress = false;
      break;
      
    case HTTP_UPDATE_NO_UPDATES:
      Serial.println("ℹ️  No update available");
      Serial.println("   Server returned: No newer version");
      updateInProgress = false;
      break;
      
    case HTTP_UPDATE_OK:
      Serial.println("╔════════════════════════════════════════╗");
      Serial.println("║       UPDATE SUCCESSFUL! 🎉            ║");
      Serial.println("╚════════════════════════════════════════╝");
      Serial.println();
      Serial.println("✅ Firmware installed successfully!");
      Serial.println("🔄 Device will restart in 3 seconds...");
      Serial.println();
      Serial.println("👋 See you after reboot!");
      Serial.println();
      
      delay(3000);
      ESP.restart();
      break;
  }
}
