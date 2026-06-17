module.exports = {
  root: true,
  env: { browser: true, es2020: true },
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:react-hooks/recommended',
  ],
  ignorePatterns: ['dist', '.eslintrc.cjs', 'eslint-rules'],
  parser: '@typescript-eslint/parser',
  plugins: ['react-refresh', { local: require('./eslint-rules/index.cjs') }],
  rules: {
    '@typescript-eslint/no-explicit-any': 'off',
    'react-hooks/exhaustive-deps': 'off',
    'react-refresh/only-export-components': 'off',

    // ─────────────────────────────────────────────────────────────────────────
    // i18n enforcement: all user-visible text MUST go through t() from
    // useLanguage() hook. Add strings to src/shared/constants/translations.ts.
    //
    // ✅ Correct:  <Text>{t('common.save')}</Text>
    // ✅ Correct:  <TextInput placeholder={t('form.note_placeholder')} />
    // ❌ Wrong:    <Text>Lưu</Text>
    // ❌ Wrong:    <TextInput placeholder="Nhập ghi chú" />
    // ❌ Wrong:    <Text>Save</Text>
    // ─────────────────────────────────────────────────────────────────────────
    'local/no-hardcoded-labels': [
      'error',
      {
        // Add extra JSX prop names that carry user-visible text in this project
        additionalTextProps: [
          'emptyTitle',
          'emptyHint',
          'headerTitle',
          'buttonLabel',
          'confirmLabel',
          'cancelLabel',
        ],
      },
    ],
  },
};
