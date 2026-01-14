# Athli Mobile - Development Guidelines

This document contains the best practices and conventions for the Athli Mobile React Native/Expo application.

---

## 1. PROJECT STRUCTURE

```
athli-mobile/
├── app/                    # Expo Router screens and layouts
│   ├── _layout.tsx         # Root layout with providers
│   ├── (tabs)/             # Tab-based navigation screens
│   └── modals/             # Modal screens organized by feature
├── components/             # Reusable UI components
├── constants/              # Theme, typography, static values
├── contexts/               # React contexts and providers
├── hooks/                  # Custom React hooks
├── lib/                    # Libraries (i18n, utilities)
│   └── i18n/               # Translation files
├── services/               # External service integrations
├── types/                  # TypeScript type definitions
└── utils/                  # Utility functions
```

---

## 2. EXPO ROUTER NAVIGATION

- Use **Expo Router** for all navigation (`expo-router`).
- File-based routing: `app/` directory structure defines routes.
- Use `Stack` for hierarchical navigation, `Tabs` for bottom navigation.
- Define modal screens with `presentation: 'modal'` in screen options.
- Handle platform differences in navigation animations:

```tsx
<Stack.Screen
  name="modals/example-modal"
  options={{
    presentation: 'modal',
    headerShown: false,
    ...(Platform.OS === 'android' && {
      animation: 'slide_from_bottom',
      gestureDirection: 'vertical',
    }),
  }}
/>
```

---

## 3. PRESSABLE COMPONENTS

### ALWAYS use `PressableOpacity` from `pressto` instead of `TouchableOpacity`

```tsx
// ✅ CORRECT
import { PressableOpacity } from 'pressto';

<PressableOpacity onPress={handlePress}>
  <Text>Press me</Text>
</PressableOpacity>

// ❌ INCORRECT - Never use TouchableOpacity
import { TouchableOpacity } from 'react-native';

<TouchableOpacity onPress={handlePress}>
  <Text>Press me</Text>
</TouchableOpacity>
```

### PressableOpacity Benefits
- Built-in spring animations
- Haptic feedback configured globally
- Consistent press states across the app
- Use `enabled` prop instead of `disabled` for enabling/disabling

```tsx
<PressableOpacity
  onPress={handlePress}
  enabled={!isDisabled}  // Use enabled, not disabled
>
  {children}
</PressableOpacity>
```

---

## 4. STYLING CONVENTIONS

### Always use `StyleSheet.create()` at the bottom of files

```tsx
// ✅ CORRECT
const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  title: {
    ...typography.h4,
    color: '#000',
  },
});

// ❌ INCORRECT - Inline objects in style prop
<View style={{ flex: 1, padding: 16 }}>
```

### Theme Colors

- **Never hardcode colors** in components.
- Use `useThemePreference()` hook to access theme colors:

```tsx
import { useThemePreference } from '@/contexts/useColorScheme';

const MyComponent = () => {
  const { colors: themeColors } = useThemePreference();

  return (
    <View style={{ backgroundColor: themeColors.background }}>
      <Text style={{ color: themeColors.text }}>Hello</Text>
    </View>
  );
};
```

### Available Theme Colors (`ThemeColors`)

**Backgrounds** (for pages, modals, containers):
- `backgroundPrimary` - Main screen/page background
- `backgroundSecondary` - Modal backgrounds, card containers
- `backgroundTertiary` - Alternative background areas

**Surfaces** (for buttons, inputs, interactive elements):
- `surfacePrimary` - Primary buttons, inputs, clickable surfaces
- `surfaceSecondary` - Secondary buttons, muted interactive elements
- `surfaceTertiary` - Tertiary interactive surfaces, disabled states

**Text & Accents**:
- `text` - Primary text color
- `mutedText` - Secondary/muted text
- `primary` - Primary accent color
- `primaryForeground` - Text on primary backgrounds
- `primarySoft` - Soft primary accent
- `border` - Border colors
- `translucentBackground` - Translucent overlays and headers

### Typography

Use the typography constants for consistent text styling:

```tsx
import { typography } from '@/constants/typography';

const styles = StyleSheet.create({
  heading: {
    ...typography.h4,
  },
  body: {
    ...typography.p2,
  },
});
```

### Typography Scale
- **Headings:** `h1` (34px) → `h8` (14px) - Bold/Semibold
- **Paragraphs:** `p1` (17px) → `p8` (9px) - Regular/Medium

### Icon Sizes

Use standardized icon sizes:

```tsx
import { iconSizes } from '@/constants/typography';

<Icon size={iconSizes.listIcons} />  // 20px
<Icon size={iconSizes.modalIcons} /> // 18px
<Icon size={iconSizes.tabBarIcons} /> // 26px
```

---

## 5. INTERNATIONALIZATION (i18n)

### NEVER hardcode text strings - Always use translations

```tsx
// ✅ CORRECT
import { useTranslations } from '@/contexts/useTranslations';

const MyComponent = () => {
  const { t } = useTranslations();

  return (
    <Text>{t('profile.title')}</Text>
    <Text>{t('general.save')}</Text>
  );
};

// ❌ INCORRECT - Hardcoded strings
<Text>Profile</Text>
<Text>Save</Text>
```

### Translation File Structure (`lib/i18n/en.ts`)

```typescript
export const en = {
  general: {
    save: 'Save',
    cancel: 'Cancel',
    delete: 'Delete',
    // ... common actions
  },
  featureName: {
    title: 'Feature Title',
    actions: {
      create: 'Create item',
    },
    modal: {
      title: 'Modal Title',
      description: 'Modal description',
    },
  },
};
```

### Translation Rules
1. Check `general` section first for reusable translations
2. Structure by feature/section matching app structure
3. Use nested objects for organization
4. Include all aria-labels, placeholders, and error messages
5. Use dot notation for nested keys: `t('calendar.newSession.title')`

---

## 6. CROSS-PLATFORM CONSIDERATIONS

### Platform-Specific Code

```tsx
import { Platform } from 'react-native';

// Conditional styling
const styles = StyleSheet.create({
  container: {
    paddingTop: Platform.OS === 'ios' ? 44 : 24,
  },
});

// Platform-specific logic
if (Platform.OS === 'ios') {
  // iOS-specific code
}
```

### Platform-Specific Icons

Use `PlatformIcon` for SF Symbols (iOS) with Lucide fallback (Android):

```tsx
import { PlatformIcon } from '@/components/platform-icon';
import { Search } from 'lucide-react-native';

<PlatformIcon
  sf="magnifyingglass"      // SF Symbol name for iOS
  IconComponent={Search}     // Lucide icon for Android
  size={20}
  color={themeColors.text}
/>
```

### Safe Areas

Always use SafeAreaView for screens:

```tsx
import { SafeAreaView } from 'react-native-safe-area-context';

const Screen = () => (
  <SafeAreaView style={{ flex: 1 }} edges={['top']}>
    {/* Content */}
  </SafeAreaView>
);
```

---

## 7. COMPONENT PATTERNS

### Functional Components with TypeScript

```tsx
type MyComponentProps = {
  title: string;
  onPress: () => void;
  disabled?: boolean;
  style?: ViewStyle;
};

export const MyComponent = ({
  title,
  onPress,
  disabled = false,
  style,
}: MyComponentProps) => {
  const { colors: themeColors } = useThemePreference();
  const { t } = useTranslations();

  return (
    <PressableOpacity
      style={[styles.container, { backgroundColor: themeColors.surface }, style]}
      onPress={onPress}
      enabled={!disabled}
    >
      <Text style={[styles.title, { color: themeColors.text }]}>
        {title}
      </Text>
    </PressableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
    borderRadius: 12,
  },
  title: {
    ...typography.p1,
  },
});
```

### Event Handlers

- All event handlers must begin with `handle`:

```tsx
const handlePress = () => { /* ... */ };
const handleTextChange = (text: string) => { /* ... */ };
const handleSubmit = () => { /* ... */ };
```

### Barrel Exports

Use `index.ts` files for component directories:

```tsx
// components/buttons/index.ts
export { FilledButton } from './filled-button';
export { OutlinedButton } from './outlined-button';
```

---

## 8. ANIMATIONS

### Use React Native Reanimated for animations

```tsx
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';

const MyAnimatedComponent = () => {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePress = () => {
    scale.value = withSpring(1.1);
  };

  return (
    <Animated.View style={animatedStyle}>
      {/* Content */}
    </Animated.View>
  );
};
```

---

## 9. LISTS AND PERFORMANCE

### Use FlashList for large lists

```tsx
import { FlashList } from '@shopify/flash-list';

<FlashList
  data={items}
  renderItem={({ item }) => <ItemComponent item={item} />}
  estimatedItemSize={80}
  keyExtractor={(item) => item.id}
/>
```

### Memoization

Use `useMemo` and `useCallback` for expensive computations:

```tsx
const filteredItems = useMemo(() => {
  return items.filter(item => item.name.includes(searchQuery));
}, [items, searchQuery]);

const handleItemPress = useCallback((id: string) => {
  // Handle press
}, []);
```

---

## 10. FILE NAMING CONVENTIONS

- **Components:** `kebab-case.tsx` (e.g., `filled-button.tsx`)
- **Hooks:** `camelCase.ts` (e.g., `useGradualAnimation.ts`)
- **Contexts:** `camelCase.tsx` (e.g., `useColorScheme.tsx`)
- **Constants:** `camelCase.ts` (e.g., `typography.ts`)
- **Types:** `kebab-case.ts` or inline in component files
- **Utilities:** `camelCase.ts` (e.g., `colorUtils.ts`)

---

## 11. IMPORTS

### Import Order

1. React/React Native imports
2. Third-party libraries
3. Internal aliases (`@/`)
4. Relative imports

```tsx
import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet } from 'react-native';

import { PressableOpacity } from 'pressto';
import { ChevronRight } from 'lucide-react-native';

import { typography } from '@/constants/typography';
import { useThemePreference } from '@/contexts/useColorScheme';
import { useTranslations } from '@/contexts/useTranslations';

import { LocalComponent } from './local-component';
```

### Path Aliases

Use `@/` alias for imports from the root:

```tsx
// ✅ CORRECT
import { typography } from '@/constants/typography';

// ❌ AVOID deep relative paths
import { typography } from '../../../constants/typography';
```

---

## 12. ACCESSIBILITY

### Touch Targets

- Minimum touch target size: **44x44 points**

```tsx
const styles = StyleSheet.create({
  touchable: {
    minHeight: 44,
    minWidth: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
```

### Accessibility Props

```tsx
<PressableOpacity
  accessibilityRole="button"
  accessibilityLabel={t('profile.logout')}
  accessibilityHint={t('profile.logoutHint')}
  onPress={handleLogout}
>
  <Text>{t('profile.logout')}</Text>
</PressableOpacity>
```

---

## 13. KEYBOARD HANDLING

### Use KeyboardController for keyboard-aware views

```tsx
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';

const FormScreen = () => (
  <KeyboardAwareScrollView>
    <TextInput />
    <TextInput />
  </KeyboardAwareScrollView>
);
```

---

## 14. GESTURE HANDLING

### Wrap app with GestureHandlerRootView

Already configured in `app/_layout.tsx`:

```tsx
import { GestureHandlerRootView } from 'react-native-gesture-handler';

<GestureHandlerRootView style={{ flex: 1 }}>
  {/* App content */}
</GestureHandlerRootView>
```

---

## 15. ERROR HANDLING

- Never throw errors to users; display friendly messages via toast/alerts
- Use early returns for validation:

```tsx
const handleSubmit = () => {
  if (!name.trim()) {
    showToast(t('validation.nameRequired'));
    return;
  }

  if (!email.includes('@')) {
    showToast(t('validation.invalidEmail'));
    return;
  }

  // Proceed with submission
};
```

---

## 16. STATE MANAGEMENT

- **Local state:** `useState`, `useReducer`
- **Computed values:** `useMemo`
- **Callbacks:** `useCallback`
- **Side effects:** `useEffect`
- **Persistent storage:** `AsyncStorage` via context providers

---

## 17. GENERAL RULES

1. **No unused imports or variables**
2. **No console.log in production** - remove before committing
3. **No TODO comments** - track tasks externally
4. **Use early returns** for cleaner code
5. **Keep components small** - extract reusable pieces
6. **TypeScript everywhere** - no `any` types
7. **Descriptive names** - no abbreviations
8. **Functions as const** - `const handlePress = () => {}`

---

## 18. EXPO-SPECIFIC BEST PRACTICES

### Expo Modules

- Use Expo modules when available (e.g., `expo-haptics`, `expo-image`)
- They provide better cross-platform consistency

### Expo Image

Prefer `expo-image` over React Native Image:

```tsx
import { Image } from 'expo-image';

<Image
  source={{ uri: imageUrl }}
  style={styles.image}
  contentFit="cover"
  transition={200}
/>
```

### Haptics

**ALWAYS use the centralized haptics utility** - NEVER import `expo-haptics` directly:

```tsx
// ✅ CORRECT
import { haptics } from '@/utils/haptics';

haptics.medium();    // Standard button press (default for all buttons)
haptics.success();   // Successful operation
haptics.error();     // Failed operation
haptics.warning();   // Warning feedback

// ❌ INCORRECT - Never use expo-haptics directly
import * as Haptics from 'expo-haptics';
Haptics.impactAsync(ImpactFeedbackStyle.Medium);
```

**Available Haptic Functions:**
- `haptics.selection()` - Light selection feedback (tab switches, minor selections)
- `haptics.light()` - Light impact (subtle interactions)
- `haptics.medium()` - **Medium impact (DEFAULT for all buttons)**
- `haptics.heavy()` - Heavy impact (critical actions, confirmations)
- `haptics.success()` - Success notification (form submissions, saves)
- `haptics.warning()` - Warning notification (validation issues)
- `haptics.error()` - Error notification (failed operations)

**Haptics Preferences:**
- Users can enable/disable haptics via `useHaptics()` hook
- All haptic calls automatically respect user preference
- Global configuration in `app/_layout.tsx` via pressto

```tsx
import { useHaptics } from '@/stores';

const { hapticsEnabled, setHapticsEnabled } = useHaptics();
```

**When to Use:**
- **Buttons/Actions:** `haptics.medium()` (configured globally via pressto)
- **Success feedback:** `haptics.success()` after save/create/update operations
- **Error feedback:** `haptics.error()` on failures
- **Manual pressables:** Call `haptics.medium()` in custom onPress handlers

---

## 19. QUICK REFERENCE

| Do ✅ | Don't ❌ |
|-------|----------|
| `PressableOpacity` from pressto | `TouchableOpacity` |
| `haptics` utility from `@/utils/haptics` | `expo-haptics` directly |
| `StyleSheet.create()` | Inline style objects |
| `useThemePreference()` colors | Hardcoded hex colors |
| `t('key.path')` translations | Hardcoded strings |
| `typography.h4` | Manual font sizes |
| `FlashList` for lists | `FlatList` for large lists |
| `expo-image` | React Native Image |
| `@/` path aliases | Deep relative imports |
| Descriptive names | Abbreviations |
| Early returns | Deep nesting |

