import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/theme';
import { pdfReportService } from '@/services/pdf-report.service';

interface PDFReportModalProps {
  visible: boolean;
  onClose: () => void;
  pdfUri: string | null;
  isGenerating: boolean;
  generationProgress?: string;
  reportSummary?: {
    propertyName: string;
    sessionDate: string;
    totalEquipments: number;
    totalOk: number;
    totalIssues: number;
  };
}

const { height: windowHeight } = Dimensions.get('window');
const PRIMARY = Colors.light.tint; // #06B6D4
const TEXT = Colors.light.text; // #11181C
const ICON = Colors.light.icon; // #6B7280

export default function PDFReportModal({
  visible,
  onClose,
  pdfUri,
  isGenerating,
  generationProgress = 'Generando informe...',
  reportSummary,
}: PDFReportModalProps) {
  const [isSharing, setIsSharing] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  const handleDownload = async () => {
    if (!pdfUri) return;

    setIsDownloading(true);
    try {
      // Construct a descriptive filename
      const filename = reportSummary
        ? `Informe_${reportSummary.propertyName}_${reportSummary.sessionDate.replace(
            /\s+/g,
            '_',
          )}`
        : 'Informe_Mantenimiento';

      // Use openPDF instead of sharePDF for a more direct experience
      await pdfReportService.openPDF(pdfUri, filename);
    } catch (error) {
      console.error('Error opening PDF:', error);
      Alert.alert('Error', 'No se pudo abrir el informe');
    } finally {
      setIsDownloading(false);
    }
  };

  const handleShare = async () => {
    if (!pdfUri) return;

    setIsSharing(true);
    try {
      const filename = reportSummary
        ? `Informe_${reportSummary.propertyName}_${reportSummary.sessionDate.replace(
            /\s+/g,
            '_',
          )}`
        : 'Informe_Mantenimiento';

      await pdfReportService.sharePDF(pdfUri, filename, 'Compartir Informe');
    } catch (error) {
      console.error('Error sharing PDF:', error);
      Alert.alert('Error', 'No se pudo compartir el informe');
    } finally {
      setIsSharing(false);
    }
  };

  const handleClose = () => {
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={handleClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.container}>
          {/* Drag Handle */}
          <View style={styles.dragHandleContainer}>
            <View style={styles.dragHandle} />
          </View>

          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color={ICON} />
            </TouchableOpacity>
            <Text style={styles.title}>Informe de Mantenimiento</Text>
            <View style={{ width: 32 }} />
          </View>

          {/* Content */}
          <View style={styles.content}>
            {isGenerating ? (
              <View style={styles.centerContent}>
                <View style={styles.loadingIconContainer}>
                  <ActivityIndicator size="large" color={PRIMARY} />
                </View>
                <Text style={styles.loadingText}>{generationProgress}</Text>
                <Text style={styles.loadingSubtext}>Por favor espere...</Text>
              </View>
            ) : pdfUri ? (
              <View style={styles.successContent}>
                {/* Success Icon */}
                <View style={styles.successIconContainer}>
                  <Ionicons name="checkmark-circle" size={64} color="#10B981" />
                </View>
                <Text style={styles.successTitle}>¡Informe Generado!</Text>
                <Text style={styles.successSubtext}>
                  El informe PDF está listo
                </Text>

                {/* Report Summary */}
                {reportSummary && (
                  <View style={styles.summaryCard}>
                    <Text style={styles.summaryTitle}>
                      {reportSummary.propertyName}
                    </Text>
                    <Text style={styles.summaryDate}>
                      {reportSummary.sessionDate}
                    </Text>

                    <View style={styles.statsRow}>
                      <View style={styles.statItem}>
                        <Text style={styles.statNumber}>
                          {reportSummary.totalEquipments}
                        </Text>
                        <Text style={styles.statLabel}>Equipos</Text>
                      </View>
                      <View style={styles.statItem}>
                        <Text style={[styles.statNumber, { color: '#10B981' }]}>
                          {reportSummary.totalOk}
                        </Text>
                        <Text style={styles.statLabel}>OK</Text>
                      </View>
                      <View style={styles.statItem}>
                        <Text style={[styles.statNumber, { color: '#EF4444' }]}>
                          {reportSummary.totalIssues}
                        </Text>
                        <Text style={styles.statLabel}>OBS</Text>
                      </View>
                    </View>
                  </View>
                )}
              </View>
            ) : (
              <View style={styles.centerContent}>
                <Ionicons
                  name="alert-circle-outline"
                  size={64}
                  color="#EF4444"
                />
                <Text style={styles.errorText}>
                  No se pudo generar el informe
                </Text>
                <Text style={styles.errorSubtext}>
                  Por favor intente nuevamente
                </Text>
              </View>
            )}
          </View>

          {/* Footer with Action Buttons */}
          {!isGenerating && pdfUri && (
            <View style={styles.footer}>
              <View style={styles.actionButtonsRow}>
                <TouchableOpacity
                  style={[styles.actionButton, styles.secondaryButton]}
                  onPress={handleShare}
                  disabled={isSharing || isDownloading}>
                  {isSharing ? (
                    <ActivityIndicator size="small" color={PRIMARY} />
                  ) : (
                    <>
                      <Ionicons
                        name="share-social-outline"
                        size={22}
                        color={PRIMARY}
                      />
                      <Text style={styles.actionButtonText}>Compartir</Text>
                    </>
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.actionButton, styles.primaryButton]}
                  onPress={handleDownload}
                  disabled={isDownloading || isSharing}>
                  {isDownloading ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <>
                      <Ionicons name="eye-outline" size={22} color="#fff" />
                      <Text
                        style={[
                          styles.actionButtonText,
                          styles.primaryButtonText,
                        ]}>
                        Abrir Informe
                      </Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>

              <TouchableOpacity style={styles.closeBtn} onPress={handleClose}>
                <Text style={styles.closeBtnText}>Cerrar</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Footer for error/loading states */}
          {!isGenerating && !pdfUri && (
            <View style={styles.footer}>
              <TouchableOpacity style={styles.closeBtn} onPress={handleClose}>
                <Text style={styles.closeBtnText}>Cerrar</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  // Modal Overlay
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: windowHeight * 0.75,
  },
  dragHandleContainer: {
    alignItems: 'center',
    paddingTop: 12,
    paddingBottom: 4,
  },
  dragHandle: {
    width: 40,
    height: 4,
    backgroundColor: '#D1D5DB',
    borderRadius: 2,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  closeButton: {
    padding: 4,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: TEXT,
  },
  content: {
    padding: 24,
  },

  // Center content for loading/error
  centerContent: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  loadingIconContainer: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#E0F7FA',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  loadingText: {
    fontSize: 16,
    fontWeight: '600',
    color: TEXT,
    marginBottom: 4,
  },
  loadingSubtext: {
    fontSize: 14,
    color: ICON,
  },

  // Success State
  successContent: {
    alignItems: 'center',
  },
  successIconContainer: {
    marginBottom: 12,
  },
  successTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: TEXT,
    marginBottom: 4,
  },
  successSubtext: {
    fontSize: 14,
    color: ICON,
    marginBottom: 20,
  },
  summaryCard: {
    backgroundColor: '#F0FDFA',
    borderRadius: 12,
    padding: 16,
    width: '100%',
    borderWidth: 1,
    borderColor: '#CCFBF1',
  },
  summaryTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: PRIMARY,
    marginBottom: 2,
  },
  summaryDate: {
    fontSize: 13,
    color: ICON,
    marginBottom: 16,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: '700',
    color: PRIMARY,
  },
  statLabel: {
    fontSize: 11,
    color: ICON,
    marginTop: 2,
  },

  // Error State
  errorText: {
    fontSize: 16,
    fontWeight: '600',
    color: TEXT,
    marginTop: 12,
  },
  errorSubtext: {
    fontSize: 14,
    color: ICON,
    marginTop: 4,
  },

  // Footer
  footer: {
    padding: 16,
    paddingBottom: 28,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    backgroundColor: '#fff',
  },
  actionButtonsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#E0F7FA',
    borderWidth: 1,
    borderColor: '#B2EBF2',
  },
  primaryButton: {
    backgroundColor: PRIMARY,
    borderColor: PRIMARY,
  },
  secondaryButton: {
    backgroundColor: '#fff',
    borderColor: PRIMARY,
  },
  actionButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: PRIMARY,
  },
  primaryButtonText: {
    color: '#fff',
  },
  closeBtn: {
    backgroundColor: '#fff',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  closeBtnText: {
    fontSize: 15,
    fontWeight: '500',
    color: ICON,
  },
});
