import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F3F4F6'
    },
    contentWrapper: {
        paddingHorizontal: 24,
        paddingTop: 16
    },
    equipmentLabel: {
        textAlign: 'center',
        color: '#6B7280',
        marginBottom: 12
    },
    stepTitleStrong: {
        textAlign: 'center',
        color: '#11181C',
        marginBottom: 12,
        fontWeight: '700',
        fontSize: 18
    },
    sectionTitle: {
        textAlign: 'center',
        color: '#1F2937',
        marginBottom: 8,
        fontWeight: '600'
    },
    segmentContainer: {
        flexDirection: 'row',
        gap: 12,
        justifyContent: 'center',
        marginBottom: 16
    },
    segment: {
        flex: 1,
        backgroundColor: '#FFFFFF',
        borderWidth: 1,
        borderColor: '#E5E7EB',
        borderRadius: 8,
        paddingVertical: 12,
        alignItems: 'center'
    },
    segmentActive: {
        backgroundColor: '#E0F2FE',
        borderColor: '#0891B2'
    },
    segmentText: {
        color: '#11181C'
    },
    segmentTextActive: {
        color: '#0891B2',
        fontWeight: '600'
    },
    inputWrapper: {
        position: 'relative',
        marginBottom: 16
    },
    input: {
        height: 46,
        backgroundColor: '#FFFFFF',
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#E5E7EB',
        paddingHorizontal: 12,
        color: '#11181C'
    },
    unitWrapper: {
        position: 'absolute',
        right: 12,
        top: 10,
        backgroundColor: '#FFFFFF',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 6
    },
    unitText: {
        color: '#6B7280'
    },
    rowBetween: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 12
    },
    countLabel: {
        color: '#1F2937'
    },
    countInput: {
        width: 80,
        height: 40,
        backgroundColor: '#FFFFFF',
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#E5E7EB',
        paddingHorizontal: 12,
        color: '#11181C'
    },
    itgCard: {
        borderWidth: 1,
        borderColor: '#E5E7EB',
        backgroundColor: '#FFFFFF',
        borderRadius: 8,
        padding: 12,
        marginBottom: 12
    },
    itgTitle: {
        fontWeight: '700',
        color: '#11181C',
        marginBottom: 8
    },
    itgSubtitle: {
        color: '#6B7280',
        marginBottom: 8
    },
    itgInput: {
        height: 40,
        backgroundColor: '#FFFFFF',
        borderRadius: 8,
        borderWidth: 2,
        borderColor: '#7DD3FC',
        paddingHorizontal: 12,
        color: '#11181C'
    },
    listButtons: {
        gap: 12
    },
    listButton: {
        backgroundColor: '#FFFFFF',
        borderWidth: 1,
        borderColor: '#E5E7EB',
        borderRadius: 8,
        paddingVertical: 12,
        alignItems: 'center'
    },
    listButtonActive: {
        borderColor: '#0891B2',
        backgroundColor: '#E0F2FE'
    },
    listButtonText: {
        color: '#11181C'
    },
    listButtonTextActive: {
        color: '#0891B2',
        fontWeight: '600'
    },
    footer: {
        paddingHorizontal: 24,
        paddingTop: 16,
        paddingBottom: 24
    },
    primaryBtn: {
        backgroundColor: '#0891B2',
        borderRadius: 8,
        paddingVertical: 12,
        alignItems: 'center'
    },
    primaryBtnText: {
        color: '#FFFFFF',
        fontWeight: '700'
    },
    secondaryBtn: {
        backgroundColor: '#FFFFFF',
        borderWidth: 1,
        borderColor: '#E5E7EB',
        borderRadius: 8,
        paddingVertical: 12,
        alignItems: 'center',
        marginTop: 12
    },
    secondaryBtnText: {
        color: '#11181C',
        fontWeight: '600'
    },
    summaryRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        backgroundColor: '#FFFFFF',
        borderWidth: 1,
        borderColor: '#E5E7EB',
        borderRadius: 8,
        paddingVertical: 10,
        paddingHorizontal: 12,
        marginBottom: 8
    },
    summaryLabel: {
        color: '#6B7280'
    },
    summaryValue: {
        color: '#11181C',
        fontWeight: '600'
    },
    labelWithIconRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between'
    },
    cnCard: {
        borderWidth: 1,
        borderColor: '#E5E7EB',
        backgroundColor: '#FFFFFF',
        borderRadius: 8,
        padding: 12,
        marginBottom: 12
    },
    cnTitle: {
        fontWeight: '700',
        color: '#11181C',
        marginBottom: 6
    },
    cnSectionTitle: {
        color: '#11181C',
        fontWeight: '600',
        marginBottom: 6
    },
    cnLabel: {
        color: '#6B7280',
        marginBottom: 6
    },
    chipGroup: {
        flexDirection: 'row',
        gap: 8,
        marginBottom: 8
    },
    chip: {
        flex: 1,
        backgroundColor: '#FFFFFF',
        borderWidth: 1,
        borderColor: '#E5E7EB',
        borderRadius: 8,
        paddingVertical: 10,
        alignItems: 'center'
    },
    chipActive: {
        borderColor: '#0891B2',
        backgroundColor: '#E0F2FE'
    },
    chipText: {
        color: '#11181C'
    },
    chipTextActive: {
        color: '#0891B2',
        fontWeight: '600'
    },
    componentToggle: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#FFFFFF',
        borderWidth: 1,
        borderColor: '#E5E7EB',
        borderRadius: 8,
        paddingVertical: 14,
        paddingHorizontal: 16
    },
    componentToggleActive: {
        borderColor: '#0891B2',
        backgroundColor: '#F0F9FF'
    },
    componentToggleText: {
        color: '#11181C',
        fontSize: 15,
        fontWeight: '500'
    },
    componentToggleTextActive: {
        color: '#0891B2',
        fontWeight: '600'
    },
    toggleSwitch: {
        width: 48,
        height: 28,
        borderRadius: 14,
        backgroundColor: '#E5E7EB',
        padding: 2,
        justifyContent: 'center'
    },
    toggleSwitchActive: {
        backgroundColor: '#0891B2'
    },
    toggleThumb: {
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: '#FFFFFF',
        alignSelf: 'flex-start'
    },
    toggleThumbActive: {
        alignSelf: 'flex-end'
    },
    componentSection: {
        marginBottom: 24,
        backgroundColor: '#F9FAFB',
        borderRadius: 12,
        padding: 16,
        borderWidth: 1,
        borderColor: '#E5E7EB'
    },
    componentSectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 8
    },
    componentSectionTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: '#11181C'
    },
    componentSectionSubtitle: {
        fontSize: 13,
        color: '#6B7280',
        marginBottom: 12
    },
    addButton: {
        padding: 4
    },
    componentCard: {
        backgroundColor: '#FFFFFF',
        borderWidth: 1,
        borderColor: '#E5E7EB',
        borderRadius: 8,
        padding: 12,
        marginBottom: 12
    },
    componentCardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 8
    },
    componentCardTitle: {
        fontSize: 14,
        fontWeight: '700',
        color: '#11181C'
    },
    emptyState: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 24
    },
    emptyStateText: {
        color: '#9CA3AF',
        fontSize: 13,
        textAlign: 'center',
        marginTop: 4
    },
    componentContainer: {
        gap: 12
    },
    toggleIconRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12
    },
    sectionIconRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8
    },
    sectionTitleWithMargin: {
        textAlign: 'center',
        color: '#1F2937',
        marginBottom: 16,
        fontWeight: '600'
    },
    emptyStateMain: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 24,
        marginTop: 24
    },
    emptyStateMainText: {
        color: '#9CA3AF',
        fontSize: 16,
        textAlign: 'center',
        marginTop: 8
    },
});

