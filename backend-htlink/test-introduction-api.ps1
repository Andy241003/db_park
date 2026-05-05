# Test VR Hotel Introduction API
# This script demonstrates how to use the Introduction API endpoints

Write-Host "`n=== VR Hotel Introduction API Test ===" -ForegroundColor Cyan

# Configuration
$baseUrl = "http://localhost:8000/api/v1"
$tenantCode = "demo"
$propertyId = 10

# Step 1: Login to get access token
Write-Host "`n1. Logging in..." -ForegroundColor Yellow
$loginBody = @{
    username = "test@park.com"
    password = "test123"
} | ConvertTo-Json

try {
    $loginResponse = Invoke-RestMethod -Uri "$baseUrl/auth/login" `
        -Method POST `
        -Body $loginBody `
        -ContentType "application/json"
    
    $accessToken = $loginResponse.access_token
    Write-Host "✓ Login successful!" -ForegroundColor Green
    Write-Host "  Token: $($accessToken.Substring(0, 50))..." -ForegroundColor Gray
} catch {
    Write-Host "✗ Login failed: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# Step 2: Get current Introduction data
Write-Host "`n2. Getting current Introduction data..." -ForegroundColor Yellow
$headers = @{
    "Authorization" = "Bearer $accessToken"
    "X-Tenant-Code" = $tenantCode
    "X-Property-Id" = $propertyId
}

try {
    $currentData = Invoke-RestMethod -Uri "$baseUrl/vr-hotel/introduction" `
        -Method GET `
        -Headers $headers
    
    Write-Host "✓ Data retrieved successfully!" -ForegroundColor Green
    Write-Host "  Is Displaying: $($currentData.isDisplaying)" -ForegroundColor Gray
    Write-Host "  VR360 Link: $($currentData.vr360Link)" -ForegroundColor Gray
    Write-Host "  Languages: $($currentData.content.PSObject.Properties.Name -join ', ')" -ForegroundColor Gray
} catch {
    Write-Host "✗ Failed to get data: $($_.Exception.Message)" -ForegroundColor Red
    $currentData = @{
        isDisplaying = $true
        content = @{}
        vr360Link = ""
        vrTitle = ""
    }
}

# Step 3: Update Introduction data
Write-Host "`n3. Updating Introduction data..." -ForegroundColor Yellow

$updateData = @{
    isDisplaying = $true
    content = @{
        vi = @{
            title = "Giới thiệu khách sạn của chúng tôi"
            shortDescription = "Chào mừng bạn đến với khách sạn sang trọng bậc nhất"
            detailedContent = "<p>Chúng tôi tự hào mang đến cho bạn trải nghiệm nghỉ dưỡng đẳng cấp 5 sao với đầy đủ tiện nghi hiện đại.</p>"
        }
        en = @{
            title = "Welcome to Our Hotel"
            shortDescription = "Experience luxury at its finest"
            detailedContent = "<p>We pride ourselves on providing you with a world-class 5-star resort experience with all modern amenities.</p>"
        }
    }
    vr360Link = "https://example.com/vr360-tour"
    vrTitle = "Virtual Tour"
} | ConvertTo-Json -Depth 10

try {
    $updatedData = Invoke-RestMethod -Uri "$baseUrl/vr-hotel/introduction" `
        -Method PUT `
        -Headers $headers `
        -Body $updateData `
        -ContentType "application/json"
    
    Write-Host "✓ Data updated successfully!" -ForegroundColor Green
    Write-Host "  Is Displaying: $($updatedData.isDisplaying)" -ForegroundColor Gray
    Write-Host "  VR360 Link: $($updatedData.vr360Link)" -ForegroundColor Gray
    Write-Host "  VR Title: $($updatedData.vrTitle)" -ForegroundColor Gray
    Write-Host "  Languages: $($updatedData.content.PSObject.Properties.Name -join ', ')" -ForegroundColor Gray
    
    # Display content for each language
    foreach ($lang in $updatedData.content.PSObject.Properties.Name) {
        $langContent = $updatedData.content.$lang
        Write-Host "`n  [$lang] Title: $($langContent.title)" -ForegroundColor Cyan
        Write-Host "  [$lang] Short Desc: $($langContent.shortDescription)" -ForegroundColor Gray
    }
} catch {
    Write-Host "✗ Failed to update: $($_.Exception.Message)" -ForegroundColor Red
    if ($_.ErrorDetails.Message) {
        Write-Host "  Details: $($_.ErrorDetails.Message)" -ForegroundColor Red
    }
}

# Step 4: Verify the update
Write-Host "`n4. Verifying the update..." -ForegroundColor Yellow

try {
    $verifyData = Invoke-RestMethod -Uri "$baseUrl/vr-hotel/introduction" `
        -Method GET `
        -Headers $headers
    
    Write-Host "✓ Verification successful!" -ForegroundColor Green
    Write-Host "`n=== Final Data ===" -ForegroundColor Cyan
    $verifyData | ConvertTo-Json -Depth 10
} catch {
    Write-Host "✗ Verification failed: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`n=== Test Complete ===" -ForegroundColor Cyan
Write-Host "You can now access the Introduction page at: http://localhost:5173/vr-hotel/introduction" -ForegroundColor Green
