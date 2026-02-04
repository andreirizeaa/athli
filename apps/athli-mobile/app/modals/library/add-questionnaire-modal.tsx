import React, { useState, useRef, useCallback, useMemo, useEffect } from 'react';
import { Platform, StyleSheet, Text, View, LayoutChangeEvent } from 'react-native';
import { PressableOpacity } from 'pressto';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { X, Check, ChevronRight } from 'lucide-react-native';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withTiming,
    Easing,
    runOnJS,
} from 'react-native-reanimated';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';

import { typography } from '@/constants/typography';
import { haptics } from '@/utils/haptics';
import { formTemplates, type FormTemplate } from '@/constants/forms';
import { useThemePreference, useColorScheme } from '@/stores';
import { useTranslations } from '@/stores';
import { IconButton } from '@/components/ui/icon-button';
import { InputBox, TextAreaInput } from '@/components/ui/form-inputs';
import { Card } from '@/components/ui/card';
import { Dialog } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { SearchBar } from '@/components/ui/search-bar';
import { hexToRgba } from '@/utils/colorUtils';
import { addQuestionnaire, editQuestionnaireDetails } from '@/services/coach/coach-questionnaire-service';
import { addClientQuestionnaire, editClientQuestionnaire } from '@/services/client/client-form-service';
import { useClientDetailStore } from '@/stores';

type TabKey = 'new' | 'templates';

export default function AddQuestionnaireModal() {
    const router = useRouter();
    const { primaryColor, colors: themeColors } = useThemePreference();
    const colorScheme = useColorScheme();
    const { t } = useTranslations();
    const insets = useSafeAreaInsets();

    const params = useLocalSearchParams<{
        editingId?: string;
        name?: string;
        description?: string;
        // Client-specific context (when adding from client detail)
        clientId?: string;
        coachId?: string;
    }>();
    const isEditing = !!params.editingId;
    const isClientContext = !!params.clientId && !!params.coachId;
    const refreshClientQuestionnaires = useClientDetailStore((state) => state.refreshSection);

    const [selectedTab, setSelectedTab] = useState<TabKey>('new');
    const underlinePosition = useSharedValue(0);
    const underlineWidth = useSharedValue(0);
    const tabLayoutsRef = useRef<{ [key: string]: { x: number; width: number } }>({});

    // Tab order for swipe navigation
    const tabOrder: TabKey[] = ['templates', 'new'];

    // Form state - Initialize with params for immediate display
    const [name, setName] = useState(params.name || '');
    const [description, setDescription] = useState(params.description || '');

    // Dialog state
    const [showErrorDialog, setShowErrorDialog] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');
    const [showDiscardDialog, setShowDiscardDialog] = useState(false);

    // TanStack Query
    const queryClient = useQueryClient();

    const saveMutation = useMutation({
        mutationFn: async (data: any) => {
            if (isEditing) {
                // Editing - check if in client context or coach library
                if (isClientContext) {
                    return editClientQuestionnaire({
                        questionnaireId: params.editingId!,
                        clientId: params.clientId!,
                        coachId: params.coachId!,
                        name: data.name,
                        description: data.description,
                    });
                }
                return editQuestionnaireDetails(data);
            }
            // Creating new questionnaire - check if for client or coach library
            if (isClientContext) {
                return addClientQuestionnaire({
                    name: data.name,
                    description: data.description,
                    clientId: params.clientId!,
                    coachId: params.coachId!,
                });
            }
            // Add to coach library
            return addQuestionnaire(data);
        },
        onSuccess: async () => {
            // Invalidate relevant queries
            await queryClient.invalidateQueries({ queryKey: ['questionnaires'] });

            if (isClientContext) {
                // Invalidate specific client form query if editing
                if (isEditing && params.editingId) {
                    await queryClient.invalidateQueries({
                        queryKey: ['clientForm', 'questionnaire', params.editingId, params.clientId]
                    });
                }
                // Refresh the client detail store section
                await refreshClientQuestionnaires('questionnaires');
            }
            haptics.success();
            handleClose();
        },
        onError: (error: Error) => {
            haptics.error();
            setErrorMessage(error.message || t('general.errorSaving'));
            setShowErrorDialog(true);
        },
    });

    // Search state for templates
    const [searchQuery, setSearchQuery] = useState('');

    // Filter templates to only show questionnaire templates
    const questionnaireTemplates = useMemo(() => {
        return formTemplates.filter((template) =>
            template.schedule?.type === 'questionnaire'
        );
    }, []);

    // Group templates by category (for now, just show all)
    const groupedTemplates = useMemo(() => {
        return [{ label: '', templates: questionnaireTemplates }];
    }, [questionnaireTemplates]);

    // Filter templates based on search query
    const filteredTemplates = useMemo(() => {
        if (!searchQuery.trim()) {
            return groupedTemplates;
        }
        const query = searchQuery.toLowerCase().trim();
        return groupedTemplates
            .map((group) => ({
                ...group,
                templates: group.templates.filter(
                    (template) =>
                        template.name.toLowerCase().includes(query) ||
                        (template.description && template.description.toLowerCase().includes(query))
                ),
            }))
            .filter((group) => group.templates.length > 0);
    }, [searchQuery, groupedTemplates]);

    // Tabs - Templates first, New second
    const tabs: { key: TabKey; label: string }[] = [
        { key: 'templates', label: t('library.addQuestionnaire.tabs.templates') },
        { key: 'new', label: t('library.addQuestionnaire.tabs.new') },
    ];

    const UNDERLINE_EXTRA_WIDTH = 8;

    // Form validation and change detection
    const { hasChanges, canComplete } = useMemo(() => {
        const trimmedName = name.trim();

        // Only name is required
        const formValid = trimmedName.length > 0;

        // Check if any field has been modified from original values
        let changes = false;
        if (isEditing) {
            changes = name !== (params.name || '') ||
                description !== (params.description || '');
        } else {
            changes = trimmedName.length > 0 ||
                description.trim().length > 0;
        }

        return {
            hasChanges: changes,
            canComplete: formValid && changes && !saveMutation.isPending,
        };
    }, [name, description, saveMutation.isPending, isEditing, params]);

    const animateUnderline = (tabKey: TabKey) => {
        const layout = tabLayoutsRef.current[tabKey];
        if (layout) {
            underlinePosition.value = withTiming(layout.x - UNDERLINE_EXTRA_WIDTH / 2, {
                duration: 300,
                easing: Easing.bezier(0.4, 0.0, 0.2, 1),
            });
            underlineWidth.value = withTiming(layout.width + UNDERLINE_EXTRA_WIDTH, {
                duration: 300,
                easing: Easing.bezier(0.4, 0.0, 0.2, 1),
            });
        }
    };

    const handleTabPress = (tabKey: TabKey) => {
        if (selectedTab !== tabKey) {
            haptics.medium();
            setSelectedTab(tabKey);
        }
    };

    // Animate underline when selectedTab changes
    useEffect(() => {
        if (selectedTab) {
            animateUnderline(selectedTab);
        }
    }, [selectedTab]);

    // Handle selecting a template
    const handleSelectTemplate = useCallback((template: FormTemplate) => {
        // Populate form fields
        setName(template.name);
        setDescription(template.description || '');

        // Switch to the New tab
        setSelectedTab('new');
    }, []);

    const handleTabLayout = (tabKey: TabKey, event: LayoutChangeEvent) => {
        const { width, x } = event.nativeEvent.layout;
        tabLayoutsRef.current[tabKey] = { x, width };

        // Initialize underline position on first layout
        if (tabKey === selectedTab && underlineWidth.value === 0) {
            underlinePosition.value = x - UNDERLINE_EXTRA_WIDTH / 2;
            underlineWidth.value = width + UNDERLINE_EXTRA_WIDTH;
        }
    };

    const animatedUnderlineStyle = useAnimatedStyle(() => {
        return {
            transform: [{ translateX: underlinePosition.value }],
            width: underlineWidth.value,
        };
    });

    const handleClose = useCallback(() => {
        if (router.canGoBack()) {
            router.back();
        }
    }, [router]);

    const handleCloseWithConfirmation = useCallback(() => {
        if (hasChanges) {
            setShowDiscardDialog(true);
        } else {
            handleClose();
        }
    }, [hasChanges, handleClose]);

    const handleSave = useCallback(() => {
        if (!canComplete) return;

        const questionnaireData: any = {
            name: name.trim(),
            description: description.trim(),
        };

        if (isEditing && params.editingId) {
            questionnaireData.id = params.editingId;
        }

        saveMutation.mutate(questionnaireData);
    }, [canComplete, name, description, isEditing, params.editingId, saveMutation]);

    const headerHeight = Platform.OS === 'android' ? 56 + insets.top : 56;
    const gradientHeight = headerHeight + 12;

    return (
        <View style={[styles.container, { backgroundColor: themeColors.backgroundSecondary }]}>
            {/* Fixed Header with gradient */}
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
                        onPress={handleCloseWithConfirmation}
                        size="md"
                        color={themeColors.text}
                    />
                    <Text style={[styles.title, { color: themeColors.text }]}>
                        {isEditing ? t('library.addQuestionnaire.editTitle') : t('library.addQuestionnaire.title')}
                    </Text>
                    <IconButton
                        icon={{ sf: 'checkmark', IconComponent: Check }}
                        onPress={handleSave}
                        size="md"
                        variant={canComplete ? 'primary' : 'default'}
                        disabled={!canComplete}
                        loading={saveMutation.isPending}
                    />
                </View>
            </View>

            {/* Scrollable Content */}
            <View style={styles.gestureContainer}>
                <KeyboardAwareScrollView
                    style={styles.scrollView}
                    contentContainerStyle={[
                        selectedTab === 'templates' ? styles.templatesContent : styles.formContent,
                        { paddingTop: headerHeight + (isEditing ? 16 : 0) }
                    ]}
                    showsVerticalScrollIndicator={false}
                    keyboardShouldPersistTaps="handled"
                    keyboardDismissMode="on-drag"
                    bottomOffset={40}
                >
                    {/* Tab Bar - only show when not editing */}
                    {!isEditing && (
                        <View style={[styles.tabsWrapper, { borderBottomColor: themeColors.border }]}>
                            <View style={styles.tabsContainer}>
                                {tabs.map((tab) => {
                                    const isSelected = selectedTab === tab.key;
                                    return (
                                        <View
                                            key={tab.key}
                                            style={styles.tabContainer}
                                            onLayout={(event) => handleTabLayout(tab.key, event)}
                                        >
                                            <PressableOpacity
                                                style={styles.tab}
                                                onPress={() => handleTabPress(tab.key)}
                                            >
                                                <Text
                                                    style={[
                                                        styles.tabText,
                                                        {
                                                            color: isSelected ? themeColors.text : themeColors.mutedText,
                                                            fontWeight: isSelected ? '700' : '600',
                                                        },
                                                    ]}
                                                >
                                                    {tab.label}
                                                </Text>
                                            </PressableOpacity>
                                        </View>
                                    );
                                })}

                                {/* Animated underline */}
                                <Animated.View
                                    style={[
                                        styles.animatedUnderline,
                                        { backgroundColor: primaryColor },
                                        animatedUnderlineStyle,
                                    ]}
                                />
                            </View>
                        </View>
                    )}

                    {/* Conditional Content */}
                    {!isEditing && selectedTab === 'templates' ? (
                        <>
                            {/* Search Bar */}
                            <SearchBar
                                value={searchQuery}
                                onChangeText={setSearchQuery}
                                placeholder={t('library.addQuestionnaire.searchPlaceholder')}
                            />

                            {/* Template Categories */}
                            {filteredTemplates.length === 0 ? (
                                <Text style={[styles.emptyText, { color: themeColors.mutedText }]}>
                                    {t('library.addQuestionnaire.noTemplatesFound')}
                                </Text>
                            ) : (
                                filteredTemplates.map((group, groupIndex) => (
                                    <View key={groupIndex} style={styles.categorySection}>
                                        {group.label && (
                                            <Text style={[styles.categoryLabel, { color: themeColors.mutedText }]}>
                                                {group.label}
                                            </Text>
                                        )}
                                        <Card variant="form">
                                            {group.templates.map((template, index) => (
                                                <React.Fragment key={template.name}>
                                                    {index > 0 && <Separator />}
                                                    <PressableOpacity
                                                        style={styles.templateRow}
                                                        onPress={() => handleSelectTemplate(template)}
                                                    >
                                                        <View style={styles.templateInfo}>
                                                            <Text style={[styles.templateName, { color: themeColors.text }]}>
                                                                {template.name}
                                                            </Text>
                                                            {template.description && (
                                                                <Text
                                                                    style={[styles.templateDescription, { color: themeColors.mutedText }]}
                                                                    numberOfLines={1}
                                                                >
                                                                    {template.description}
                                                                </Text>
                                                            )}
                                                        </View>
                                                        <ChevronRight {...({ size: 20, color: themeColors.mutedText } as any)} />
                                                    </PressableOpacity>
                                                </React.Fragment>
                                            ))}
                                        </Card>
                                    </View>
                                ))
                            )}
                        </>
                    ) : (
                        <>
                            <InputBox
                                label={t('library.addQuestionnaire.name')}
                                value={name}
                                onChangeText={setName}
                                placeholder={t('library.addQuestionnaire.namePlaceholder')}
                                required
                                autoFocus
                            />

                            <TextAreaInput
                                label={t('library.addQuestionnaire.description')}
                                value={description}
                                onChangeText={setDescription}
                                placeholder={t('library.addQuestionnaire.descriptionPlaceholder')}
                                numberOfLines={3}
                                minHeight={60}
                            />
                        </>
                    )}
                </KeyboardAwareScrollView>
            </View>

            <Dialog
                visible={showErrorDialog}
                onClose={() => setShowErrorDialog(false)}
                title={t('general.error')}
                message={errorMessage}
                showCloseIcon={false}
                buttons={[{ label: t('general.ok'), onPress: () => setShowErrorDialog(false), variant: 'primary' }]}
            />

            <Dialog
                visible={showDiscardDialog}
                onClose={() => setShowDiscardDialog(false)}
                title={t('library.addQuestionnaire.discardChangesTitle')}
                message={t('library.addQuestionnaire.discardChangesMessage')}
                buttons={[
                    { label: t('general.cancel'), onPress: () => setShowDiscardDialog(false), variant: 'secondary' },
                    { label: t('library.addQuestionnaire.discardChanges'), onPress: handleClose, variant: 'destructive' },
                ]}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    gestureContainer: {
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
    tabsWrapper: {
        borderBottomWidth: 1,
        marginHorizontal: -16,
        paddingHorizontal: 16,
        paddingTop: 16,
    },
    tabsContainer: {
        flexDirection: 'row',
        flex: 1,
    },
    tabContainer: {
        flex: 1,
    },
    tab: {
        paddingBottom: 12,
        alignItems: 'center',
    },
    tabText: {
        ...typography.p1,
    },
    animatedUnderline: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        height: 3,
        borderRadius: 1.5,
        zIndex: 10,
    },
    scrollView: {
        flex: 1,
    },
    formContent: {
        flexGrow: 1,
        paddingHorizontal: 16,
        paddingBottom: 32,
        gap: 16,
    },
    templatesContent: {
        flexGrow: 1,
        paddingHorizontal: 16,
        paddingBottom: 32,
        gap: 16,
    },
    emptyText: {
        ...typography.p2,
        textAlign: 'center',
        marginTop: 32,
    },
    categorySection: {
        gap: 8,
    },
    categoryLabel: {
        ...typography.p1,
        fontWeight: '600',
    },
    templateRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 12,
    },
    templateInfo: {
        flex: 1,
        marginRight: 12,
    },
    templateName: {
        ...typography.p1,
        fontWeight: '500',
    },
    templateDescription: {
        ...typography.p3,
        marginTop: 2,
    },
});

