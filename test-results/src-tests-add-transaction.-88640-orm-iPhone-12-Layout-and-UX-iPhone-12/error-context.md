# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: src\tests\add-transaction.qa.spec.ts >> Mobile QA/Test Agent - Add Transaction Form >> iPhone 12 Layout and UX
- Location: src\tests\add-transaction.qa.spec.ts:209:3

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: locator('div.space-y-1\\.5:has-text("Destination wallet"), div.space-y-1\\.5:has-text("Ví nhận")')
Expected: visible
Timeout: 5000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 5000ms
  - waiting for locator('div.space-y-1\\.5:has-text("Destination wallet"), div.space-y-1\\.5:has-text("Ví nhận")')

```

```yaml
- main:
  - button "Quay lại":
    - img
  - heading "Thêm giao dịch" [level=2]
  - button "Chi tiêu"
  - button "Thu nhập"
  - button "Chuyển khoản"
  - paragraph: Số tiền
  - text: VND
  - textbox "0"
  - paragraph: Ngày giao dịch
  - button "Hôm qua"
  - button "Hôm nay"
  - button "Tùy chọn":
    - img
    - text: Tùy chọn
  - paragraph: 📅 Th 6, 29/05/2026, 10:02
  - paragraph: Ghi chú
  - textbox "Ghi chú (tùy chọn)"
  - text: Receipt (Optional)
  - button "Capture / Select Receipt"
  - button "Lưu giao dịch"
- navigation:
  - link "Tổng quan":
    - /url: /
    - img
    - text: Tổng quan
  - link "Lịch sử":
    - /url: /transactions
    - img
    - text: Lịch sử
  - link "Thêm":
    - /url: /transactions/new
    - img
  - link "Ngân sách":
    - /url: /budgets
    - img
    - text: Ngân sách
  - button "Thêm":
    - img
    - text: Thêm
```

# Test source

```ts
  63  | 
  64  |   // Verify initial visibility
  65  |   await expect(header).toBeVisible();
  66  |   await expect(backBtn).toBeVisible();
  67  |   await expect(title).toBeVisible();
  68  |   await expect(typeSelector).toBeVisible();
  69  |   await expect(formScrollContainer).toBeVisible();
  70  |   await expect(saveBtn).toBeVisible();
  71  | 
  72  |   console.log('Verified basic elements are visible.');
  73  | 
  74  |   // Get initial positions
  75  |   const initialHeaderBox = await header.boundingBox();
  76  |   const initialBackBtnBox = await backBtn.boundingBox();
  77  |   const initialTypeSelectorBox = await typeSelector.boundingBox();
  78  | 
  79  |   expect(initialHeaderBox).not.toBeNull();
  80  |   expect(initialBackBtnBox).not.toBeNull();
  81  |   expect(initialTypeSelectorBox).not.toBeNull();
  82  | 
  83  |   console.log('Initial positions captured:');
  84  |   console.log(`- Header Y: ${initialHeaderBox?.y}`);
  85  |   console.log(`- Back Button Y: ${initialBackBtnBox?.y}`);
  86  |   console.log(`- Type Selector Y: ${initialTypeSelectorBox?.y}`);
  87  | 
  88  |   // 4. Overlap verification at top
  89  |   // Amount input (first field) should be visible and not covered by Type Selector or Header
  90  |   const amountInput = page.locator('input[inputmode="numeric"], input[inputmode="decimal"]').first();
  91  |   await expect(amountInput).toBeVisible();
  92  |   const amountInputBox = await amountInput.boundingBox();
  93  |   
  94  |   if (amountInputBox && initialTypeSelectorBox) {
  95  |     const isAmountCovered = amountInputBox.y < (initialTypeSelectorBox.y + initialTypeSelectorBox.height);
  96  |     console.log(`- Amount Input Top Y: ${amountInputBox.y}, Type Selector Bottom Y: ${initialTypeSelectorBox.y + initialTypeSelectorBox.height}`);
  97  |     if (isAmountCovered) {
  98  |       console.log(`[BUG P2] Overlap detected: First field (Amount Input) is covered by the sticky Type Selector!`);
  99  |     }
  100 |     expect(isAmountCovered).toBe(false);
  101 |   }
  102 | 
  103 |   // 5. Scroll from top to bottom
  104 |   console.log('Scrolling down to the bottom of the form...');
  105 |   // Since formScrollContainer is the container with overflow-y-auto, scroll it
  106 |   await formScrollContainer.evaluate(node => node.scrollTop = node.scrollHeight);
  107 |   await page.waitForTimeout(500); // wait for scroll animation/repaint
  108 | 
  109 |   // Get positions after scrolling
  110 |   const scrolledHeaderBox = await header.boundingBox();
  111 |   const scrolledBackBtnBox = await backBtn.boundingBox();
  112 |   const scrolledTypeSelectorBox = await typeSelector.boundingBox();
  113 | 
  114 |   console.log('Scrolled positions captured:');
  115 |   console.log(`- Header Y after scroll: ${scrolledHeaderBox?.y}`);
  116 |   console.log(`- Back Button Y after scroll: ${scrolledBackBtnBox?.y}`);
  117 |   console.log(`- Type Selector Y after scroll: ${scrolledTypeSelectorBox?.y}`);
  118 | 
  119 |   // VERIFY STICKY BEHAVIOR:
  120 |   // Title / Header must remain at the exact same Y position
  121 |   const isHeaderSticky = Math.abs((scrolledHeaderBox?.y ?? -999) - (initialHeaderBox?.y ?? 0)) < 2;
  122 |   console.log(`- Header Y delta: ${Math.abs((scrolledHeaderBox?.y ?? 0) - (initialHeaderBox?.y ?? 0))}`);
  123 |   if (!isHeaderSticky) {
  124 |     console.log(`[BUG P1] Header/Title floated away! It is not fixed/sticky at the top.`);
  125 |   }
  126 |   expect(isHeaderSticky).toBe(true);
  127 | 
  128 |   // Back Button must remain at the exact same Y position and be clickable
  129 |   const isBackBtnSticky = Math.abs((scrolledBackBtnBox?.y ?? -999) - (initialBackBtnBox?.y ?? 0)) < 2;
  130 |   if (!isBackBtnSticky) {
  131 |     console.log(`[BUG P1] Back Button floated away! It is not fixed/sticky.`);
  132 |   }
  133 |   expect(isBackBtnSticky).toBe(true);
  134 |   await expect(backBtn).toBeEnabled();
  135 | 
  136 |   // Transaction Type Selector must remain sticky
  137 |   const isTypeSelectorSticky = Math.abs((scrolledTypeSelectorBox?.y ?? -999) - (initialTypeSelectorBox?.y ?? 0)) < 2;
  138 |   if (!isTypeSelectorSticky) {
  139 |     console.log(`[BUG P1] Transaction Type Selector floated away! It did not stay sticky.`);
  140 |   }
  141 |   expect(isTypeSelectorSticky).toBe(true);
  142 | 
  143 |   // 6. Interaction under scrolled state
  144 |   // Toggle transaction types when scrolled
  145 |   console.log('Toggling transaction types while scrolled...');
  146 |   const incomeBtn = page.locator('button:has-text("Income"), button:has-text("Thu nhập")');
  147 |   const transferBtn = page.locator('button:has-text("Transfer"), button:has-text("Chuyển khoản")');
  148 |   const expenseBtn = page.locator('button:has-text("Expense"), button:has-text("Chi tiêu")');
  149 | 
  150 |   if (await incomeBtn.isVisible()) {
  151 |     await incomeBtn.click();
  152 |     await page.waitForTimeout(200);
  153 |     // Check if toggle worked (active class changed or state updated)
  154 |     // Wallet input should still be there
  155 |     await expect(amountInput).toBeVisible();
  156 |   }
  157 | 
  158 |   if (await transferBtn.isVisible()) {
  159 |     await transferBtn.click();
  160 |     await page.waitForTimeout(200);
  161 |     // When transfer is selected, check if destination wallet select is visible
  162 |     const destWalletSelect = page.locator('div.space-y-1\\.5:has-text("Destination wallet"), div.space-y-1\\.5:has-text("Ví nhận")');
> 163 |     await expect(destWalletSelect).toBeVisible();
      |                                    ^ Error: expect(locator).toBeVisible() failed
  164 |   }
  165 | 
  166 |   // Switch back to expense
  167 |   if (await expenseBtn.isVisible()) {
  168 |     await expenseBtn.click();
  169 |     await page.waitForTimeout(200);
  170 |   }
  171 | 
  172 |   // 7. Input focus & mock keyboard behavior (reduce viewport height)
  173 |   console.log('Focusing Note input and simulating mobile keyboard (reduced viewport height)...');
  174 |   const noteInput = page.locator('input[placeholder*="Note"], input[placeholder*="Ghi chú"]');
  175 |   await noteInput.scrollIntoViewIfNeeded();
  176 |   await noteInput.focus();
  177 |   await noteInput.fill('QA Mobile Test Note');
  178 | 
  179 |   // Reduce height by 250px to simulate keyboard overlay
  180 |   const keyboardHeight = 250;
  181 |   await page.setViewportSize({ width: w, height: h - keyboardHeight });
  182 |   await page.waitForTimeout(300);
  183 | 
  184 |   // Check if active input or save button is still interactable or not completely hidden
  185 |   const noteBox = await noteInput.boundingBox();
  186 |   const keyboardSaveBox = await saveBtn.boundingBox();
  187 |   console.log(`- Note Input Y with keyboard: ${noteBox?.y}, Save Button Y with keyboard: ${keyboardSaveBox?.y}`);
  188 |   
  189 |   if (keyboardSaveBox) {
  190 |     const isSaveButtonVisible = keyboardSaveBox.y > 0 && (keyboardSaveBox.y + keyboardSaveBox.height) <= (h - keyboardHeight);
  191 |     console.log(`- Save button visible within keyboard viewport: ${isSaveButtonVisible}`);
  192 |     if (!isSaveButtonVisible) {
  193 |       console.log(`[BUG P2] Save button is hidden/clipped under keyboard viewport!`);
  194 |     }
  195 |   }
  196 | 
  197 |   // Restore viewport
  198 |   await page.setViewportSize({ width: w, height: h });
  199 |   await page.waitForTimeout(300);
  200 | 
  201 |   // 8. Back button interaction at scrolled position
  202 |   console.log('Testing Back Button click from scrolled state...');
  203 |   await backBtn.click();
  204 |   await page.waitForURL('**/transactions', { timeout: 3000 });
  205 |   console.log('Successfully navigated back to transactions page.');
  206 | }
  207 | 
  208 | test.describe('Mobile QA/Test Agent - Add Transaction Form', () => {
  209 |   test('iPhone 12 Layout and UX', async ({ page }) => {
  210 |     await runQATestForViewport(page, 'iPhone 12', 390, 844);
  211 |   });
  212 | 
  213 |   test('iPhone X Layout and UX', async ({ page }) => {
  214 |     await runQATestForViewport(page, 'iPhone X', 375, 812);
  215 |   });
  216 | 
  217 |   test('Pixel 5 Layout and UX', async ({ page }) => {
  218 |     await runQATestForViewport(page, 'Pixel 5', 412, 915);
  219 |   });
  220 | 
  221 |   test('Tablet (iPad) Layout and UX', async ({ page }) => {
  222 |     await runQATestForViewport(page, 'Tablet (iPad)', 768, 1024);
  223 |   });
  224 | });
  225 | 
```