import { test, expect } from '@playwright/test';

// Function to run the QA test sequence for a given viewport
async function runQATestForViewport(page: any, viewportName: string, w: number, h: number) {
  console.log(`\n==================================================`);
  console.log(`Running QA Mobile Test on viewport: ${viewportName} (${w}x${h})`);
  console.log(`==================================================`);

  await page.setViewportSize({ width: w, height: h });

  // 1. Setup step: ensure at least one wallet exists so form is fully populated
  await page.goto('/wallets');
  await page.waitForLoadState('networkidle');

  // Check if we need to create wallets (if not present)
  const noWalletsText = page.locator('text=No accounts yet, Chưa có tài khoản');
  const addBtn = page.locator('button:has-text("+")');
  if (await noWalletsText.isVisible().catch(() => false)) {
    console.log('No wallets empty state is visible.');
  }
  
  if (await addBtn.isVisible()) {
    console.log('Creating wallets for testing...');
    // Create Wallet 1: Cash
    await addBtn.click();
    await page.locator('form input[type="text"]').first().fill('Ví Tiền Mặt');
    await page.locator('form input[inputmode="numeric"], form input[inputmode="decimal"]').first().fill('1000000');
    await page.locator('form button[type="submit"]').click();
    await page.waitForTimeout(600); // Wait for bottom sheet transition
    
    // Create Wallet 2: Bank
    await addBtn.click();
    await page.locator('form input[type="text"]').first().fill('Ví Ngân Hàng');
    // Select Bank type
    const bankTypeBtn = page.locator('button:has-text("🏦 Bank"), button:has-text("🏦 Ngân hàng")');
    if (await bankTypeBtn.isVisible()) {
      await bankTypeBtn.click();
    }
    await page.locator('form input[inputmode="numeric"], form input[inputmode="decimal"]').first().fill('2000000');
    await page.locator('form button[type="submit"]').click();
    await page.waitForTimeout(600);
  }

  // 2. Open Add Transaction Screen
  await page.goto('/transactions/new');
  await page.waitForLoadState('networkidle');
  console.log('Opened Add Transaction Form.');

  // 3. Identify elements
  const header = page.locator('div.sticky.top-0');
  const backBtn = header.locator('button');
  const title = header.locator('h2');
  const typeSelector = page.locator('form > div.sticky');
  const formScrollContainer = page.locator('form > div.overflow-y-auto');
  const saveBtn = page.locator('form button[type="submit"]');

  // Verify initial visibility
  await expect(header).toBeVisible();
  await expect(backBtn).toBeVisible();
  await expect(title).toBeVisible();
  await expect(typeSelector).toBeVisible();
  await expect(formScrollContainer).toBeVisible();
  await expect(saveBtn).toBeVisible();

  console.log('Verified basic elements are visible.');

  // Get initial positions
  const initialHeaderBox = await header.boundingBox();
  const initialBackBtnBox = await backBtn.boundingBox();
  const initialTypeSelectorBox = await typeSelector.boundingBox();

  expect(initialHeaderBox).not.toBeNull();
  expect(initialBackBtnBox).not.toBeNull();
  expect(initialTypeSelectorBox).not.toBeNull();

  console.log('Initial positions captured:');
  console.log(`- Header Y: ${initialHeaderBox?.y}`);
  console.log(`- Back Button Y: ${initialBackBtnBox?.y}`);
  console.log(`- Type Selector Y: ${initialTypeSelectorBox?.y}`);

  // 4. Overlap verification at top
  // Amount input (first field) should be visible and not covered by Type Selector or Header
  const amountInput = page.locator('input[inputmode="numeric"], input[inputmode="decimal"]').first();
  await expect(amountInput).toBeVisible();
  const amountInputBox = await amountInput.boundingBox();
  
  if (amountInputBox && initialTypeSelectorBox) {
    const isAmountCovered = amountInputBox.y < (initialTypeSelectorBox.y + initialTypeSelectorBox.height);
    console.log(`- Amount Input Top Y: ${amountInputBox.y}, Type Selector Bottom Y: ${initialTypeSelectorBox.y + initialTypeSelectorBox.height}`);
    if (isAmountCovered) {
      console.log(`[BUG P2] Overlap detected: First field (Amount Input) is covered by the sticky Type Selector!`);
    }
    expect(isAmountCovered).toBe(false);
  }

  // 5. Scroll from top to bottom
  console.log('Scrolling down to the bottom of the form...');
  // Since formScrollContainer is the container with overflow-y-auto, scroll it
  await formScrollContainer.evaluate((node: HTMLElement) => {
    node.scrollTop = node.scrollHeight;
  });
  await page.waitForTimeout(500); // wait for scroll animation/repaint

  // Get positions after scrolling
  const scrolledHeaderBox = await header.boundingBox();
  const scrolledBackBtnBox = await backBtn.boundingBox();
  const scrolledTypeSelectorBox = await typeSelector.boundingBox();

  console.log('Scrolled positions captured:');
  console.log(`- Header Y after scroll: ${scrolledHeaderBox?.y}`);
  console.log(`- Back Button Y after scroll: ${scrolledBackBtnBox?.y}`);
  console.log(`- Type Selector Y after scroll: ${scrolledTypeSelectorBox?.y}`);

  // VERIFY STICKY BEHAVIOR:
  // Title / Header must remain at the exact same Y position
  const isHeaderSticky = Math.abs((scrolledHeaderBox?.y ?? -999) - (initialHeaderBox?.y ?? 0)) < 2;
  console.log(`- Header Y delta: ${Math.abs((scrolledHeaderBox?.y ?? 0) - (initialHeaderBox?.y ?? 0))}`);
  if (!isHeaderSticky) {
    console.log(`[BUG P1] Header/Title floated away! It is not fixed/sticky at the top.`);
  }
  expect(isHeaderSticky).toBe(true);

  // Back Button must remain at the exact same Y position and be clickable
  const isBackBtnSticky = Math.abs((scrolledBackBtnBox?.y ?? -999) - (initialBackBtnBox?.y ?? 0)) < 2;
  if (!isBackBtnSticky) {
    console.log(`[BUG P1] Back Button floated away! It is not fixed/sticky.`);
  }
  expect(isBackBtnSticky).toBe(true);
  await expect(backBtn).toBeEnabled();

  // Transaction Type Selector must remain sticky
  const isTypeSelectorSticky = Math.abs((scrolledTypeSelectorBox?.y ?? -999) - (initialTypeSelectorBox?.y ?? 0)) < 2;
  if (!isTypeSelectorSticky) {
    console.log(`[BUG P1] Transaction Type Selector floated away! It did not stay sticky.`);
  }
  expect(isTypeSelectorSticky).toBe(true);

  // 6. Interaction under scrolled state
  // Toggle transaction types when scrolled
  console.log('Toggling transaction types while scrolled...');
  const incomeBtn = page.locator('button:has-text("Income"), button:has-text("Thu nhập")');
  const transferBtn = page.locator('button:has-text("Transfer"), button:has-text("Chuyển khoản")');
  const expenseBtn = page.locator('button:has-text("Expense"), button:has-text("Chi tiêu")');

  if (await incomeBtn.isVisible()) {
    await incomeBtn.click();
    await page.waitForTimeout(200);
    // Check if toggle worked (active class changed or state updated)
    // Wallet input should still be there
    await expect(amountInput).toBeVisible();
  }

  if (await transferBtn.isVisible()) {
    await transferBtn.click();
    await page.waitForTimeout(200);
    // When transfer is selected, check if destination wallet select is visible
    const destWalletSelect = page.locator('div.space-y-1\\.5:has-text("Destination wallet"), div.space-y-1\\.5:has-text("Ví nhận")');
    await expect(destWalletSelect).toBeVisible();
  }

  // Switch back to expense
  if (await expenseBtn.isVisible()) {
    await expenseBtn.click();
    await page.waitForTimeout(200);
  }

  // 7. Input focus & mock keyboard behavior (reduce viewport height)
  console.log('Focusing Note input and simulating mobile keyboard (reduced viewport height)...');
  const noteInput = page.locator('input[placeholder*="Note"], input[placeholder*="Ghi chú"]');
  await noteInput.scrollIntoViewIfNeeded();
  await noteInput.focus();
  await noteInput.fill('QA Mobile Test Note');

  // Reduce height by 250px to simulate keyboard overlay
  const keyboardHeight = 250;
  await page.setViewportSize({ width: w, height: h - keyboardHeight });
  await page.waitForTimeout(300);

  // Check if active input or save button is still interactable or not completely hidden
  const noteBox = await noteInput.boundingBox();
  const keyboardSaveBox = await saveBtn.boundingBox();
  console.log(`- Note Input Y with keyboard: ${noteBox?.y}, Save Button Y with keyboard: ${keyboardSaveBox?.y}`);
  
  if (keyboardSaveBox) {
    const isSaveButtonVisible = keyboardSaveBox.y > 0 && (keyboardSaveBox.y + keyboardSaveBox.height) <= (h - keyboardHeight);
    console.log(`- Save button visible within keyboard viewport: ${isSaveButtonVisible}`);
    if (!isSaveButtonVisible) {
      console.log(`[BUG P2] Save button is hidden/clipped under keyboard viewport!`);
    }
  }

  // Restore viewport
  await page.setViewportSize({ width: w, height: h });
  await page.waitForTimeout(300);

  // 8. Back button interaction at scrolled position
  console.log('Testing Back Button click from scrolled state...');
  await backBtn.click();
  await page.waitForURL('**/transactions', { timeout: 3000 });
  console.log('Successfully navigated back to transactions page.');
}

test.describe('Mobile QA/Test Agent - Add Transaction Form', () => {
  test('iPhone 12 Layout and UX', async ({ page }) => {
    await runQATestForViewport(page, 'iPhone 12', 390, 844);
  });

  test('iPhone X Layout and UX', async ({ page }) => {
    await runQATestForViewport(page, 'iPhone X', 375, 812);
  });

  test('Pixel 5 Layout and UX', async ({ page }) => {
    await runQATestForViewport(page, 'Pixel 5', 412, 915);
  });

  test('Tablet (iPad) Layout and UX', async ({ page }) => {
    await runQATestForViewport(page, 'Tablet (iPad)', 768, 1024);
  });
});
