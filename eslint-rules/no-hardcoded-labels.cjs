/**
 * ESLint rule: local/no-hardcoded-labels
 *
 * Prevents hardcoding UI text strings directly in JSX/TSX.
 * All user-visible labels must be routed through the t() function
 * from useLanguage() hook, which reads from translations.ts.
 *
 * ✅ Correct:   <Text>{t('common.save')}</Text>
 * ✅ Correct:   <TextInput placeholder={t('form.note_placeholder')} />
 * ❌ Wrong:     <Text>Lưu</Text>
 * ❌ Wrong:     <TextInput placeholder="Nhập ghi chú" />
 * ❌ Wrong:     <Text>Save</Text>   (inside JSX literal)
 */

'use strict';

// Unicode ranges that cover Vietnamese diacritical characters
const VIETNAMESE_PATTERN = /[\u00C0-\u024F\u1E00-\u1EFF]/;

// Common English UI label words that should NOT be hardcoded in JSX
// This list is intentionally conservative — only unambiguous UI text
const ENGLISH_UI_LABEL_PATTERN =
  /^(Save|Cancel|Delete|Edit|Add|Close|Confirm|Submit|Back|Next|Yes|No|Done|Apply|Reset|Search|Loading\.\.\.|Error|Success|Retry|Settings|Dashboard|Reports|History|Budgets|Bills|Transfer|Income|Expense|Balance|Total|Wallet|Category|Amount|Date|Note|OK|Upload|Export|Import|Restore|Backup)$/;

// JSX attribute names that carry user-visible text
const TEXT_PROP_NAMES = new Set([
  'placeholder',
  'title',
  'label',
  'aria-label',
  'accessibilityLabel',
  'accessibilityHint',
  'hint',
  'helperText',
  'errorText',
  'description',
  'emptyText',
  'buttonText',
  'submitText',
  'cancelText',
  'confirmText',
]);

/**
 * Returns true if the string value should trigger the rule.
 * Logic:
 *  1. Always flag strings containing Vietnamese diacritics.
 *  2. Flag common English UI words only when they appear directly
 *     as JSX text content (not in attributes) or in specific text
 *     JSX attributes listed in TEXT_PROP_NAMES.
 */
function isForbiddenString(value, isTextProp) {
  if (!value || typeof value !== 'string') return false;
  const trimmed = value.trim();
  if (!trimmed) return false;

  // Skip very short strings that are unlikely to be labels (e.g. "(", "/", "·")
  if (trimmed.length < 2) return false;

  // Always flag Vietnamese text
  if (VIETNAMESE_PATTERN.test(trimmed)) return true;

  // Flag common English UI labels in JSX text or recognized text props
  if (isTextProp && ENGLISH_UI_LABEL_PATTERN.test(trimmed)) return true;

  return false;
}

module.exports = {
  meta: {
    type: 'suggestion',
    docs: {
      description:
        'Disallow hardcoded Vietnamese or UI label strings. Use t() from useLanguage() and translations.ts instead.',
      category: 'Best Practices',
      recommended: true,
      url: 'src/shared/constants/translations.ts',
    },
    schema: [
      {
        type: 'object',
        properties: {
          // Additional attribute names to check beyond the built-in list
          additionalTextProps: {
            type: 'array',
            items: { type: 'string' },
            default: [],
          },
        },
        additionalProperties: false,
      },
    ],
    messages: {
      noHardcodedVietnamese:
        'Hardcoded Vietnamese text "{{ value }}" found. Use t(\'key\') from useLanguage() and add the string to translations.ts.',
      noHardcodedLabel:
        'Hardcoded UI label "{{ value }}" found in JSX. Use t(\'key\') from useLanguage() and add the string to translations.ts.',
    },
  },

  create(context) {
    const options = context.options[0] || {};
    const extraProps = new Set(options.additionalTextProps || []);

    // Skip the translations file itself and test/spec files
    const filename = context.getFilename();
    if (
      filename.includes('translations.ts') ||
      filename.includes('translations.js') ||
      /\.(test|spec)\.(ts|tsx|js|jsx)$/.test(filename) ||
      filename.includes('__tests__') ||
      filename.includes('eslint-rules')
    ) {
      return {};
    }

    function isTextPropName(name) {
      return TEXT_PROP_NAMES.has(name) || extraProps.has(name);
    }

    function reportVietnamese(node, value) {
      context.report({
        node,
        messageId: 'noHardcodedVietnamese',
        data: { value: value.trim() },
      });
    }

    function reportLabel(node, value) {
      context.report({
        node,
        messageId: 'noHardcodedLabel',
        data: { value: value.trim() },
      });
    }

    return {
      // ── JSX text nodes: <Text>Lưu</Text>  or  <Text>Save</Text>
      JSXText(node) {
        const value = node.value;
        if (!value || !value.trim()) return;

        if (VIETNAMESE_PATTERN.test(value)) {
          reportVietnamese(node, value);
          return;
        }

        // For JSX text nodes, check common English UI labels
        if (ENGLISH_UI_LABEL_PATTERN.test(value.trim())) {
          reportLabel(node, value);
        }
      },

      // ── JSX attribute string literals:
      //    placeholder="Nhập..."  title="Save"  label="Chi phí"
      JSXAttribute(node) {
        if (!node.name || !node.value) return;

        const attrName = node.name.type === 'JSXNamespacedName'
          ? node.name.name.name
          : node.name.name;

        const isTextProp = isTextPropName(attrName);

        // String literal: placeholder="..."
        if (node.value.type === 'Literal') {
          const value = node.value.value;
          if (typeof value !== 'string') return;

          if (VIETNAMESE_PATTERN.test(value)) {
            reportVietnamese(node.value, value);
            return;
          }

          if (isTextProp && ENGLISH_UI_LABEL_PATTERN.test(value.trim())) {
            reportLabel(node.value, value);
          }
        }

        // JSX expression: placeholder={"Nhập..."}
        if (
          node.value.type === 'JSXExpressionContainer' &&
          node.value.expression.type === 'Literal'
        ) {
          const value = node.value.expression.value;
          if (typeof value !== 'string') return;

          if (VIETNAMESE_PATTERN.test(value)) {
            reportVietnamese(node.value.expression, value);
            return;
          }

          if (isTextProp && ENGLISH_UI_LABEL_PATTERN.test(value.trim())) {
            reportLabel(node.value.expression, value);
          }
        }
      },
    };
  },
};
