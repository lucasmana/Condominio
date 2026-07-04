import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, TextInput, Modal, ActivityIndicator, Image, Platform, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as SecureStore from 'expo-secure-store';
import { supabase } from '../config/supabase';
import { useAuth } from '../context/AuthContext';
import { Theme } from '../theme/theme';

export default function HomeScreen({ route }) {
  const { user, signOut } = useAuth();
  const [stats, setStats] = useState({
    condominios: 0,
    comunicados: 0,
    tasks: 0,
    orcamentos: 0,
  });
  const [reports, setReports] = useState([]);
  const [sidebarVisible, setSidebarVisible] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  // Anotações
  const [notesList, setNotesList] = useState([]);
  const [isAddingNote, setIsAddingNote] = useState(false);
  const [newNoteText, setNewNoteText] = useState('');

  // Exclusão de Relatórios
  const [deleteConfirmVisible, setDeleteConfirmVisible] = useState(false);
  const [reportToDelete, setReportToDelete] = useState(null);

  // Toast Animado
  const progressAnim = useRef(new Animated.Value(1)).current;
  const [toastVisible, setToastVisible] = useState(false);
  const [toastType, setToastType] = useState('success');
  const [toastMessage, setToastMessage] = useState('');

  const showToast = (type, message) => {
    setToastType(type);
    setToastMessage(message);
    setToastVisible(true);
    
    progressAnim.setValue(1);
    
    Animated.timing(progressAnim, {
      toValue: 0,
      duration: 2000,
      useNativeDriver: false,
    }).start(({ finished }) => {
      if (finished) {
        setToastVisible(false);
      }
    });
  };

  useEffect(() => {
    loadStats();
    loadReports();
    loadNotes();
    checkLoginToast();
  }, []);

  const checkLoginToast = async () => {
    try {
      const justLoggedIn = await SecureStore.getItemAsync('just_logged_in');
      if (justLoggedIn === 'true') {
        await SecureStore.deleteItemAsync('just_logged_in');
        showToast('success', 'Login efetuado com sucesso!');
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    if (route.params?.openSidebar) {
      setSidebarVisible(true);
    }
  }, [route.params]);

  const loadStats = async () => {
    const [condominios, comunicados, tasks, orcamentos] = await Promise.all([
      supabase.from('condominios').select('*', { count: 'exact' }).eq('user_id', user.id),
      supabase.from('comunicados').select('*', { count: 'exact' }).eq('user_id', user.id),
      supabase.from('tasks').select('*', { count: 'exact' }).eq('user_id', user.id),
      supabase.from('orcamentos').select('*', { count: 'exact' }).eq('user_id', user.id),
    ]);
    setStats({
      condominios: condominios.count || 0,
      comunicados: comunicados.count || 0,
      tasks: tasks.count || 0,
      orcamentos: orcamentos.count || 0,
    });
  };

  const loadReports = async () => {
    const { data } = await supabase
      .from('reports')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    setReports(data || []);
  };

  const confirmDeleteReport = (report) => {
    setReportToDelete(report);
    setDeleteConfirmVisible(true);
  };

  const executeDeleteReport = async () => {
    if (reportToDelete) {
      await supabase.from('reports').delete().eq('id', reportToDelete.id);
      setDeleteConfirmVisible(false);
      setReportToDelete(null);
      loadReports();
    }
  };

  const loadNotes = async () => {
    try {
      const savedNotes = await SecureStore.getItemAsync('notes_list_' + user.id);
      if (savedNotes) {
        setNotesList(JSON.parse(savedNotes));
      }
    } catch (e) {
      console.error('Error loading notes:', e);
    }
  };

  const addNote = async () => {
    if (!newNoteText.trim()) return;
    const newNote = {
      id: Date.now().toString(),
      text: newNoteText
    };
    const updatedList = [newNote, ...notesList];
    setNotesList(updatedList);
    setNewNoteText('');
    setIsAddingNote(false);
    try {
      await SecureStore.setItemAsync('notes_list_' + user.id, JSON.stringify(updatedList));
    } catch (e) {
      console.error('Error saving note:', e);
    }
  };

  const deleteNote = async (id) => {
    const updatedList = notesList.filter(note => note.id !== id);
    setNotesList(updatedList);
    try {
      await SecureStore.setItemAsync('notes_list_' + user.id, JSON.stringify(updatedList));
    } catch (e) {
      console.error('Error deleting note:', e);
    }
  };

  const generateReport = async () => {
    try {
      const fifteenDaysAgo = new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString();
      
      const [condos, coms, tsk, orc] = await Promise.all([
        supabase.from('condominios').select('*').eq('user_id', user.id).gte('created_at', fifteenDaysAgo),
        supabase.from('comunicados').select('*').eq('user_id', user.id).gte('created_at', fifteenDaysAgo),
        supabase.from('tasks').select('*').eq('user_id', user.id).gte('created_at', fifteenDaysAgo),
        supabase.from('orcamentos').select('*').eq('user_id', user.id).gte('created_at', fifteenDaysAgo),
      ]);

      const condoCount = condos.data?.length || 0;
      const comCount = coms.data?.length || 0;
      const taskCount = tsk.data?.length || 0;
      const orcCount = orc.data?.length || 0;
      
      const nowFormatted = new Date().toLocaleDateString('pt-BR');
      const content = `Relatório de Atividades - Período de 15 dias (Gerado em ${nowFormatted}):\n\nNeste período foram registrados:\n- ${condoCount} condomínio(s) cadastrado(s)\n- ${comCount} comunicado(s) enviado(s)\n- ${taskCount} tarefa(s) criada(s)\n- ${orcCount} orçamento(s) cadastrado(s).`;
      
      const { data, error } = await supabase
        .from('reports')
        .insert({ content, user_id: user.id })
        .select();
        
      if (error) throw error;
      
      if (data && data[0]) {
        setReports(prev => [data[0], ...prev]);
        Alert.alert('Sucesso', 'Relatório de 15 dias gerado com sucesso!');
      }
    } catch (e) {
      console.error('Error generating report:', e);
      Alert.alert('Erro', 'Não foi possível gerar o relatório.');
    }
  };

  const handlePrintReport = (report) => {
    if (Platform.OS === 'web') {
      const printWindow = window.open('', '_blank');
      printWindow.document.write(`<html><head><title>Relatório</title></head><body style="font-family: Arial, sans-serif; padding: 40px; background: #fff; color: #000;">`);
      printWindow.document.write(`<h1>Relatório de Atividades do Condomínio</h1>`);
      printWindow.document.write(`<p><strong>Data:</strong> ${new Date(report.created_at).toLocaleDateString('pt-BR')}</p>`);
      printWindow.document.write(`<hr style="border: 1px solid #ddd; margin: 20px 0;"/>`);
      printWindow.document.write(`<pre style="font-size: 16px; white-space: pre-wrap; font-family: inherit; line-height: 1.6;">${report.content}</pre>`);
      printWindow.document.close();
      printWindow.print();
    } else {
      Alert.alert('Imprimir Relatório', `Enviado para a impressora:\n\n${report.content}`);
    }
  };

  const pickAvatar = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permissão necessária', 'Precisamos de acesso à galeria para alterar a foto.');
        return;
      }

      let result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.5,
      });

      if (result.canceled) return;

      setUploadingAvatar(true);
      const selectedImageUri = result.assets[0].uri;
      
      const fileExt = 'jpg';
      const fileName = `avatars/${user.id}_${Date.now()}.${fileExt}`;
      
      const res = await fetch(selectedImageUri);
      const blob = await res.blob();
      
      const { error: uploadError } = await supabase.storage
        .from('comunicados')
        .upload(fileName, blob, {
          contentType: 'image/jpeg',
          upsert: true
        });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('comunicados')
        .getPublicUrl(fileName);

      const publicUrl = urlData.publicUrl;

      const { error: updateError } = await supabase.auth.updateUser({
        data: { avatar_url: publicUrl }
      });

      if (updateError) throw updateError;

      Alert.alert('Sucesso', 'Foto de perfil atualizada com sucesso!');
    } catch (error) {
      console.error('Erro ao atualizar avatar:', error);
      Alert.alert('Erro', 'Não foi possível atualizar a foto de perfil: ' + error.message);
    } finally {
      setUploadingAvatar(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: Theme.Colors.background }}>
      {toastVisible ? (
        <View style={[
          styles.toastContainer, 
          toastType === 'success' ? styles.toastSuccess : (toastType === 'warning' ? styles.toastWarning : styles.toastError)
        ]}>
          <View style={styles.toastContent}>
            <Text style={styles.toastText}>{toastMessage}</Text>
          </View>
          <Animated.View style={[
            styles.progressBar,
            {
              width: progressAnim.interpolate({
                inputRange: [0, 1],
                outputRange: ['0%', '100%'],
              }),
              backgroundColor: toastType === 'success' ? '#45B058' : (toastType === 'warning' ? '#FFC107' : '#FF3B30')
            }
          ]} />
        </View>
      ) : null}

      <ScrollView style={styles.container}>
        <View style={styles.headerContainer}>
          <Text style={styles.header}>Dash<Text style={styles.headerAccent}>board</Text></Text>
          <TouchableOpacity style={styles.profileButton} onPress={() => setSidebarVisible(true)}>
            {user?.user_metadata?.avatar_url ? (
              <Image 
                source={{ uri: user.user_metadata.avatar_url }} 
                style={{ width: '100%', height: '100%', borderRadius: 20 }} 
              />
            ) : (
              <Ionicons name="person-outline" size={24} color={Theme.Colors.primary} />
            )}
          </TouchableOpacity>
        </View>
      
        <View style={styles.statsGrid}>
          {/* Card 1: Condominios com listra verde na esquerda */}
          <View style={[styles.statCard, styles.statCardGreen]}>
            <View style={styles.statIconContainer}>
              <Ionicons name="business-outline" size={24} color={Theme.Colors.primary} />
            </View>
            <Text style={styles.statNumber}>{stats.condominios}</Text>
            <Text style={styles.statLabel}>Condomínios</Text>
            <Text style={styles.statSubLabel}>Gerenciados</Text>
          </View>
          {/* Card 2: Comunicados */}
          <View style={styles.statCard}>
            <View style={styles.statIconContainer}>
              <Ionicons name="megaphone-outline" size={24} color={Theme.Colors.primary} />
            </View>
            <Text style={styles.statNumber}>{stats.comunicados}</Text>
            <Text style={styles.statLabel}>Comunicados</Text>
            <Text style={styles.statSubLabel}>Enviados</Text>
          </View>
          {/* Card 3: Tarefas com listra verde na esquerda */}
          <View style={[styles.statCard, styles.statCardGreen]}>
            <View style={styles.statIconContainer}>
              <Ionicons name="checkmark-circle-outline" size={24} color={Theme.Colors.primary} />
            </View>
            <Text style={styles.statNumber}>{stats.tasks}</Text>
            <Text style={styles.statLabel}>Tarefas</Text>
            <Text style={styles.statSubLabel}>Pendentes</Text>
          </View>
          {/* Card 4: Orcamentos */}
          <View style={styles.statCard}>
            <View style={styles.statIconContainer}>
              <Ionicons name="wallet-outline" size={24} color={Theme.Colors.primary} />
            </View>
            <Text style={styles.statNumber}>{stats.orcamentos}</Text>
            <Text style={styles.statLabel}>Orçamentos</Text>
            <Text style={styles.statSubLabel}>Registrados</Text>
          </View>
        </View>

        {/* Seção Anotações */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Anotações</Text>
            {!isAddingNote && (
              <TouchableOpacity style={styles.headerAddNoteButton} onPress={() => setIsAddingNote(true)}>
                <Ionicons name="add" size={20} color={Theme.Colors.primary} />
              </TouchableOpacity>
            )}
          </View>
          
          {isAddingNote ? (
            <View style={styles.newNoteContainer}>
              <TextInput
                style={styles.notesInput}
                placeholder="Adicione suas anotações aqui..."
                placeholderTextColor={Theme.Colors.textTertiary}
                value={newNoteText}
                onChangeText={setNewNoteText}
                multiline
              />
              <View style={styles.noteButtonsRow}>
                <TouchableOpacity style={styles.cancelNoteButton} onPress={() => { setIsAddingNote(false); setNewNoteText(''); }}>
                  <Text style={styles.cancelNoteText}>Cancelar</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.saveNoteButton} onPress={addNote}>
                  <Text style={styles.saveNoteText}>Adicionar</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <View style={styles.notesListContainer}>
              {notesList.length === 0 ? (
                <Text style={styles.emptyNotesText}>Nenhuma anotação. Clique em "+" para adicionar.</Text>
              ) : (
                notesList.map((note) => (
                  <View key={note.id} style={styles.noteItem}>
                    <Text style={styles.noteText}>{note.text}</Text>
                    <TouchableOpacity onPress={() => deleteNote(note.id)}>
                      <Ionicons name="close" size={20} color="#888888" />
                    </TouchableOpacity>
                  </View>
                ))
              )}
            </View>
          )}
        </View>

        {/* Seção Relatórios */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Relatórios</Text>
            <TouchableOpacity style={styles.headerAddNoteButton} onPress={generateReport}>
              <Ionicons name="refresh-outline" size={20} color={Theme.Colors.primary} />
            </TouchableOpacity>
          </View>
          
          {reports.length === 0 ? (
            <View style={styles.emptyReports}>
              <Ionicons name="document-text-outline" size={48} color={Theme.Colors.textTertiary} />
              <Text style={styles.emptyText}>Nenhum relatório</Text>
            </View>
          ) : (
            reports.map((report) => (
              <View key={report.id} style={styles.reportCard}>
                <View style={styles.reportHeader}>
                  <Text style={styles.reportDate}>
                    {new Date(report.created_at).toLocaleDateString('pt-BR')}
                  </Text>
                  <View style={styles.reportActions}>
                    <TouchableOpacity onPress={() => handlePrintReport(report)}>
                      <Ionicons name="print-outline" size={20} color={Theme.Colors.primary} />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => confirmDeleteReport(report)}>
                      <Ionicons name="close" size={24} color="#888888" />
                    </TouchableOpacity>
                  </View>
                </View>
                <View style={styles.reportContent}>
                  <Text style={styles.reportTitle}>Resumo dos últimos 15 dias</Text>
                  <Text style={styles.reportText}>{report.content}</Text>
                </View>
              </View>
            ))
          )}
        </View>
      </ScrollView>

      {/* Barra Lateral do Usuário (Drawer/Modal) */}
      <Modal
        visible={sidebarVisible}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setSidebarVisible(false)}
      >
        <TouchableOpacity 
          style={styles.sidebarOverlay} 
          activeOpacity={1} 
          onPress={() => setSidebarVisible(false)}
        >
          <View style={styles.sidebarContentContainer}>
            <TouchableOpacity 
              activeOpacity={1} 
              style={styles.sidebarContent}
            >
              <View style={styles.sidebarHeader}>
                <TouchableOpacity onPress={() => setSidebarVisible(false)}>
                  <Ionicons name="close-outline" size={32} color={Theme.Colors.primary} />
                </TouchableOpacity>
              </View>

              <View style={styles.sidebarProfileInfo}>
                <TouchableOpacity 
                  style={styles.avatarContainer} 
                  onPress={pickAvatar}
                  disabled={uploadingAvatar}
                >
                  {uploadingAvatar ? (
                    <ActivityIndicator size="small" color={Theme.Colors.primary} />
                  ) : user?.user_metadata?.avatar_url ? (
                    <Image 
                      source={{ uri: user.user_metadata.avatar_url }} 
                      style={styles.avatarImage} 
                    />
                  ) : (
                    <View style={styles.avatarPlaceholder}>
                      <Ionicons name="camera-outline" size={32} color={Theme.Colors.primary} />
                    </View>
                  )}
                </TouchableOpacity>
                
                <Text style={styles.sidebarName}>
                  {user?.user_metadata?.full_name || 'Usuário'}
                </Text>
                
                <Text style={styles.sidebarEmail}>
                  {user?.email || ''}
                </Text>
              </View>

              <TouchableOpacity 
                style={styles.logoutButton} 
                onPress={async () => {
                  setSidebarVisible(false);
                  await signOut();
                }}
              >
                <Ionicons name="log-out-outline" size={24} color={Theme.Colors.error} />
                <Text style={styles.logoutText}>Sair</Text>
              </TouchableOpacity>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Modal Personalizado de Confirmação de Exclusão de Relatório */}
      <Modal
        visible={deleteConfirmVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setDeleteConfirmVisible(false)}
      >
        <View style={styles.confirmOverlay}>
          <View style={styles.confirmCard}>
            <Text style={styles.confirmTitle}>Confirmar Exclusão</Text>
            <Text style={styles.confirmMessage}>Tem certeza de que deseja excluir este relatório?</Text>
            
            <View style={styles.confirmButtonsContainer}>
              <TouchableOpacity 
                style={[styles.confirmButton, styles.confirmCancelButton]} 
                onPress={() => setDeleteConfirmVisible(false)}
              >
                <Text style={styles.confirmCancelText}>Cancelar</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.confirmButton, styles.confirmDeleteButton]} 
                onPress={executeDeleteReport}
              >
                <Text style={styles.confirmDeleteText}>Confirmar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Theme.Colors.background,
    padding: Theme.Spacing.padding.lg,
  },
  headerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Theme.Spacing.margin.xl,
    marginTop: Theme.Spacing.margin.sm,
  },
  header: {
    fontSize: Theme.Typography.fontSize.large,
    fontWeight: Theme.Typography.fontWeight.bold,
    color: Theme.Colors.textPrimary,
  },
  headerAccent: {
    color: Theme.Colors.primary,
  },
  profileButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 2,
    borderColor: Theme.Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Theme.Spacing.gap.md,
    marginBottom: Theme.Spacing.margin.xl,
  },
  statCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: Theme.Colors.cardBackground,
    padding: Theme.Spacing.padding.lg,
    borderRadius: Theme.BorderRadius.lg,
    alignItems: 'flex-start',
    ...Theme.Shadows.card,
  },
  statCardGreen: {
    borderLeftWidth: 8,
    borderLeftColor: Theme.Colors.primary,
  },
  statIconContainer: {
    width: 48,
    height: 48,
    borderRadius: Theme.BorderRadius.md,
    backgroundColor: Theme.Colors.inputBackground,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Theme.Spacing.margin.sm,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  statNumber: {
    fontSize: 36,
    fontWeight: Theme.Typography.fontWeight.bold,
    color: Theme.Colors.primary,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: Theme.Typography.fontSize.body,
    fontWeight: Theme.Typography.fontWeight.semiBold,
    color: Theme.Colors.textPrimary,
  },
  statSubLabel: {
    fontSize: Theme.Typography.fontSize.small,
    color: Theme.Colors.textSecondary,
    marginTop: 2,
  },
  section: {
    marginBottom: Theme.Spacing.margin.xl,
  },
  sectionTitle: {
    fontSize: Theme.Typography.fontSize.heading,
    fontWeight: Theme.Typography.fontWeight.bold,
    color: Theme.Colors.textPrimary,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Theme.Spacing.margin.md,
  },
  headerAddNoteButton: {
    padding: Theme.Spacing.padding.sm,
  },
  newNoteContainer: {
    backgroundColor: Theme.Colors.inputBackground,
    borderRadius: Theme.BorderRadius.lg,
    padding: Theme.Spacing.padding.lg,
  },
  notesInput: {
    fontSize: Theme.Typography.fontSize.body,
    color: Theme.Colors.textPrimary,
    minHeight: 80,
    textAlignVertical: 'top',
    marginBottom: Theme.Spacing.margin.md,
  },
  noteButtonsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: Theme.Spacing.gap.md,
  },
  cancelNoteButton: {
    paddingHorizontal: Theme.Spacing.padding.lg,
    paddingVertical: Theme.Spacing.padding.sm,
    borderRadius: Theme.BorderRadius.sm,
    backgroundColor: '#444444',
  },
  cancelNoteText: {
    color: '#CCCCCC',
    fontWeight: Theme.Typography.fontWeight.bold,
  },
  saveNoteButton: {
    paddingHorizontal: Theme.Spacing.padding.lg,
    paddingVertical: Theme.Spacing.padding.sm,
    borderRadius: Theme.BorderRadius.sm,
    backgroundColor: Theme.Colors.primary,
  },
  saveNoteText: {
    color: '#FFFFFF',
    fontWeight: Theme.Typography.fontWeight.bold,
  },
  notesListContainer: {
    gap: Theme.Spacing.gap.md,
  },
  noteItem: {
    backgroundColor: Theme.Colors.cardBackground,
    padding: Theme.Spacing.padding.lg,
    borderRadius: Theme.BorderRadius.lg,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    ...Theme.Shadows.card,
  },
  noteText: {
    fontSize: Theme.Typography.fontSize.body,
    color: Theme.Colors.textPrimary,
    flex: 1,
    paddingRight: Theme.Spacing.padding.md,
  },
  emptyNotesText: {
    fontSize: Theme.Typography.fontSize.body,
    color: Theme.Colors.textTertiary,
    textAlign: 'center',
    paddingVertical: Theme.Spacing.padding.lg,
  },
  emptyReports: {
    backgroundColor: Theme.Colors.cardBackground,
    borderRadius: Theme.BorderRadius.lg,
    padding: Theme.Spacing.padding.xxl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontSize: Theme.Typography.fontSize.body,
    color: Theme.Colors.textTertiary,
    marginTop: Theme.Spacing.margin.sm,
  },
  reportCard: {
    backgroundColor: Theme.Colors.cardBackground,
    borderRadius: Theme.BorderRadius.lg,
    padding: Theme.Spacing.padding.lg,
    marginBottom: Theme.Spacing.margin.md,
    ...Theme.Shadows.card,
  },
  reportHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Theme.Spacing.margin.md,
  },
  reportDate: {
    fontSize: Theme.Typography.fontSize.small,
    color: Theme.Colors.textSecondary,
  },
  reportActions: {
    flexDirection: 'row',
    gap: Theme.Spacing.gap.lg,
    alignItems: 'center',
  },
  reportContent: {
    borderTopWidth: 1,
    borderTopColor: Theme.Colors.border,
    paddingTop: Theme.Spacing.padding.md,
  },
  reportTitle: {
    fontSize: Theme.Typography.fontSize.body,
    fontWeight: Theme.Typography.fontWeight.semiBold,
    color: Theme.Colors.textPrimary,
    marginBottom: Theme.Spacing.margin.sm,
  },
  reportText: {
    fontSize: Theme.Typography.fontSize.small,
    color: Theme.Colors.textSecondary,
    lineHeight: Theme.Typography.lineHeight.tight,
  },
  // Sidebar Styles
  sidebarOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  sidebarContentContainer: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  sidebarContent: {
    width: '75%',
    height: '100%',
    backgroundColor: '#1E1E1E',
    padding: Theme.Spacing.padding.lg,
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: { width: -2, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 5,
    elevation: 16,
  },
  sidebarHeader: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    marginTop: Platform.OS === 'ios' ? 40 : 20,
  },
  sidebarProfileInfo: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingTop: 50, // Posição um pouco mais para cima
  },
  avatarContainer: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: '#333333',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Theme.Spacing.margin.xl,
    overflow: 'hidden',
    borderWidth: 3,
    borderColor: Theme.Colors.primary,
  },
  avatarImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  avatarPlaceholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sidebarName: {
    fontSize: Theme.Typography.fontSize.heading,
    fontWeight: Theme.Typography.fontWeight.bold,
    color: '#FFFFFF',
    marginBottom: Theme.Spacing.margin.xs,
  },
  sidebarEmail: {
    fontSize: Theme.Typography.fontSize.body,
    color: '#CCCCCC',
    textAlign: 'center',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Theme.Spacing.gap.md,
    paddingVertical: Theme.Spacing.padding.lg,
    borderTopWidth: 1,
    borderTopColor: '#333333',
    marginBottom: Platform.OS === 'ios' ? 20 : 10,
  },
  logoutText: {
    fontSize: Theme.Typography.fontSize.body,
    fontWeight: Theme.Typography.fontWeight.bold,
    color: Theme.Colors.error,
  },
  // Confirmação de Exclusão
  confirmOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Theme.Spacing.padding.xl,
  },
  confirmCard: {
    width: '85%',
    backgroundColor: '#2A2A2A',
    borderRadius: Theme.BorderRadius.lg,
    padding: Theme.Spacing.padding.xl,
    borderWidth: 1,
    borderColor: '#444444',
    alignItems: 'center',
    ...Theme.Shadows.card,
  },
  confirmTitle: {
    fontSize: Theme.Typography.fontSize.heading,
    fontWeight: Theme.Typography.fontWeight.bold,
    color: '#FFFFFF',
    marginBottom: Theme.Spacing.margin.md,
  },
  confirmMessage: {
    fontSize: Theme.Typography.fontSize.body,
    color: '#CCCCCC',
    textAlign: 'center',
    marginBottom: Theme.Spacing.margin.xl,
    lineHeight: Theme.Typography.lineHeight.normal,
  },
  confirmButtonsContainer: {
    flexDirection: 'row',
    gap: Theme.Spacing.gap.md,
    width: '100%',
  },
  confirmButton: {
    flex: 1,
    paddingVertical: Theme.Spacing.padding.md,
    borderRadius: Theme.BorderRadius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmCancelButton: {
    backgroundColor: '#555555',
  },
  confirmCancelText: {
    color: '#CCCCCC',
    fontWeight: Theme.Typography.fontWeight.bold,
  },
  confirmDeleteButton: {
    backgroundColor: '#FF3B30',
  },
  confirmDeleteText: {
    color: '#FFFFFF',
    fontWeight: Theme.Typography.fontWeight.bold,
  },
  // Toast Styles
  toastContainer: {
    position: 'absolute',
    top: 40,
    left: 16,
    right: 16,
    borderRadius: Theme.BorderRadius.md,
    overflow: 'hidden',
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    zIndex: 9999,
  },
  toastSuccess: {
    backgroundColor: '#E8F5E9',
    borderWidth: 1,
    borderColor: '#45B058',
  },
  toastWarning: {
    backgroundColor: '#FFFDE7',
    borderWidth: 1,
    borderColor: '#FFC107',
  },
  toastError: {
    backgroundColor: '#FFEBEE',
    borderWidth: 1,
    borderColor: '#FF3B30',
  },
  toastContent: {
    padding: Theme.Spacing.padding.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  toastText: {
    fontSize: Theme.Typography.fontSize.body,
    fontWeight: Theme.Typography.fontWeight.bold,
    color: '#333333',
    textAlign: 'center',
  },
  progressBar: {
    height: 4,
    width: '100%',
  },
});
