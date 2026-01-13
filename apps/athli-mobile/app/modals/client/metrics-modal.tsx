import React, { useState, useMemo } from 'react';
import { useRouter } from 'expo-router';
import { View, StyleSheet, Text, Platform, FlatList } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { X, Search, ChevronRight } from 'lucide-react-native';
import { PressableOpacity } from 'pressto';

import { useThemePreference, useColorScheme } from '@/stores';
import { typography } from '@/constants/typography';
import { useTranslations } from '@/stores';
import { IconButton } from '@/components/ui/icon-button';
import { SearchBar } from '@/components/ui/search-bar';
import { defaultMetrics, type DefaultMetric } from '@/constants/metrics';
import { Separator } from '@/components/ui/separator';
import { useModalCallbacks } from '@/stores';
import { hexToRgba } from '@/utils/colorUtils';

export default function MetricsModal() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { colors: themeColors } = useThemePreference();
    const colorScheme = useColorScheme();
    const { t } = useTranslations();
    const { triggerMetricSelect } = useModalCallbacks();

    const [searchQuery, setSearchQuery] = useState('');

    const handleClose = () => {
        router.back();
    };

    const handleSelectMetric = (metric: DefaultMetric) => {
        triggerMetricSelect(metric);
        router.back();
    };

    const filteredMetrics = useMemo(() => {
        const query = searchQuery.toLowerCase().trim();
        const results: { section: string; metrics: DefaultMetric[] }[] = [];

        defaultMetrics.forEach(section => {
            const matches = section.metrics.filter(m =>
                m.name.toLowerCase().includes(query)
            );
            if (matches.length > 0) {
                results.push({ section: section.label, metrics: matches });
            }
        });

        return results;
    }, [searchQuery]);

    const headerHeight = Platform.OS === 'android' ? 56 + insets.top : 56;
    const gradientHeight = headerHeight + 12;

    const renderItem = ({ item }: { item: { section: string; metrics: DefaultMetric[] } }) => (
        <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: themeColors.mutedText }]}>{item.section}</Text>
            <View style={[styles.listContainer, { backgroundColor: themeColors.backgroundTertiary }]}>
                {item.metrics.map((metric, index) => (
                    <React.Fragment key={metric.name}>
                        {index > 0 && <Separator />}
                        <PressableOpacity
                            style={styles.metricRow}
                            onPress={() => handleSelectMetric(metric)}
                        >
                            <View style={styles.metricInfo}>
                                <Text style={[styles.metricName, { color: themeColors.text }]}>{metric.name}</Text>
                                <Text style={[styles.metricUnit, { color: themeColors.mutedText }]}>{metric.unit}</Text>
                            </View>
                            <ChevronRight {...({ size: 18, color: themeColors.mutedText } as any)} />
                        </PressableOpacity>
                    </React.Fragment>
                ))}
            </View>
        </View>
    );

    return (
        <View style={[styles.container, { backgroundColor: themeColors.backgroundSecondary }]}>
            {/* Header */}
            <View style={[styles.fixedHeader, { height: headerHeight }]}>
                <LinearGradient
                    colors={[
                        hexToRgba(themeColors.backgroundSecondary, 1),
                        hexToRgba(themeColors.backgroundSecondary, 0.85),
                        hexToRgba(themeColors.backgroundSecondary, 0.5),
                        hexToRgba(themeColors.backgroundSecondary, 0),
                    ]}
                    locations={[0, 0.5, 0.8, 1]}
                    style={[styles.headerGradient, { height: gradientHeight }]}
                    pointerEvents="none"
                />
                <View
                    style={[
                        styles.header,
                        {
                            paddingTop: Platform.OS === 'android' ? 12 + insets.top : 12,
                        },
                    ]}
                >
                    <IconButton
                        icon={{ sf: 'xmark', IconComponent: X }}
                        onPress={handleClose}
                        size="md"
                        color={themeColors.text}
                    />
                    <Text style={[styles.title, { color: themeColors.text }]}>
                        {t('clientDetail.sections.metrics')}
                    </Text>
                    <View style={{ width: 44 }} />
                </View>
            </View>

            <View style={[styles.content]}>
                <FlatList
                    data={filteredMetrics}
                    keyExtractor={(item) => item.section}
                    renderItem={renderItem}
                    contentContainerStyle={[styles.listContent, { paddingTop: headerHeight + 16 }]}
                    ListHeaderComponent={
                        <View style={styles.searchContainer}>
                            <SearchBar
                                value={searchQuery}
                                onChangeText={setSearchQuery}
                                placeholder={t('general.searchPlaceholder')}
                            />
                        </View>
                    }
                    showsVerticalScrollIndicator={false}
                />
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    fixedHeader: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 10,
    },
    headerGradient: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingBottom: 12,
    },
    title: {
        ...typography.h6,
        flex: 1,
        textAlign: 'center',
    },
    content: {
        flex: 1,
    },
    searchContainer: {
        paddingHorizontal: 16,
        paddingBottom: 16,
    },
    listContent: {
        paddingBottom: 40,
    },
    section: {
        marginBottom: 24,
        paddingHorizontal: 16,
    },
    sectionTitle: {
        ...typography.p4,
        marginBottom: 8,
        marginLeft: 4,
    },
    listContainer: {
        borderRadius: 16,
        overflow: 'hidden',
    },
    metricRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
    },
    metricInfo: {
        flex: 1,
    },
    metricName: {
        ...typography.p1,
        fontWeight: '500',
    },
    metricUnit: {
        ...typography.p3,
        marginTop: 2,
    },
});
