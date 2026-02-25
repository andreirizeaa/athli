import React, { useMemo } from 'react';
import { Platform } from 'react-native';
import MarkdownDisplay from 'react-native-markdown-display';
import { useThemePreference } from '@/stores';
import { typography } from '@/constants/typography';

interface MarkdownProps {
  children: string;
}

export function Markdown({ children }: MarkdownProps) {
  const { colors } = useThemePreference();

  const styles = useMemo(
    () => ({
      body: {
        ...typography.p2,
        color: colors.text,
      },
      heading1: {
        ...typography.h3,
        color: colors.text,
        marginTop: 16,
        marginBottom: 8,
      },
      heading2: {
        ...typography.h4,
        color: colors.text,
        marginTop: 14,
        marginBottom: 6,
      },
      heading3: {
        ...typography.h5,
        color: colors.text,
        marginTop: 12,
        marginBottom: 4,
      },
      paragraph: {
        marginTop: 0,
        marginBottom: 8,
      },
      strong: {
        fontWeight: '700' as const,
      },
      em: {
        fontStyle: 'italic' as const,
      },
      link: {
        color: colors.primary,
        textDecorationLine: 'underline' as const,
      },
      blockquote: {
        backgroundColor: colors.surfacePrimary,
        borderLeftColor: colors.primary,
        borderLeftWidth: 3,
        paddingLeft: 12,
        paddingVertical: 8,
        marginVertical: 8,
        borderRadius: 4,
      },
      code_inline: {
        backgroundColor: colors.translucentBackground,
        color: colors.text,
        borderRadius: 4,
        paddingHorizontal: 5,
        paddingVertical: 2,
        fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
        fontSize: 13,
      },
      code_block: {
        backgroundColor: colors.surfacePrimary,
        color: colors.text,
        borderRadius: 8,
        padding: 12,
        marginVertical: 8,
        fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
        fontSize: 13,
      },
      fence: {
        backgroundColor: colors.surfacePrimary,
        color: colors.text,
        borderRadius: 8,
        padding: 12,
        marginVertical: 8,
        fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
        fontSize: 13,
      },
      bullet_list: {
        marginVertical: 4,
      },
      ordered_list: {
        marginVertical: 4,
      },
      list_item: {
        marginVertical: 2,
      },
      bullet_list_icon: {
        color: colors.primary,
        marginRight: 8,
        fontSize: 14,
        lineHeight: 20,
      },
      ordered_list_icon: {
        color: colors.primary,
        marginRight: 8,
        fontSize: 14,
        lineHeight: 20,
      },
      table: {
        borderColor: colors.border,
        borderWidth: 1,
        borderRadius: 6,
        marginVertical: 8,
      },
      thead: {
        backgroundColor: colors.surfacePrimary,
      },
      th: {
        padding: 8,
        borderColor: colors.border,
        color: colors.text,
        fontWeight: '600' as const,
      },
      td: {
        padding: 8,
        borderColor: colors.border,
        color: colors.text,
      },
      hr: {
        backgroundColor: colors.border,
        height: 1,
        marginVertical: 12,
      },
    }),
    [colors],
  );

  return <MarkdownDisplay style={styles}>{children}</MarkdownDisplay>;
}
