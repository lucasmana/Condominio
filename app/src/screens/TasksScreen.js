import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, FlatList, Alert, Modal, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { supabase } from '../config/supabase';
import { useAuth } from '../context/AuthContext';
import { Theme } from '../theme/theme';

export default function TasksScreen({ navigation }) {
  const { user } = useAuth();
  const [tasks, setTasks] = useState([]);
  const [condominios, setCondominios] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [condominioId, setCondominioId] = useState('');
  const [descricao, setDescricao] = useState('');
  const [nivelUrgencia, setNivelUrgencia] = useState('sem_urgencia'); // 'sem_urgencia', 'emergencia', 'urgente'
  const [dataLimite, setDataLimite] = useState('');
  const [deleteConfirmVisible, setDeleteConfirmVisible] = useState(false);
  const [itemToDelete, setItemToDelete] = useState(null);

  useFocusEffect(
    React.useCallback(() => {
      loadTasks();
      loadCondominios();
    }, [user.id])
  );

  const loadCondominios = async () => {
    try {
      const { data, error } = await supabase.from('condominios').select('*').eq('user_id', user.id);
      if (error) throw error;
      setCondominios(data || []);
    } catch (err) {
      console.error('Error loading condominios:', err);
      Alert.alert('Erro', 'Não foi possível carregar os condomínios: ' + err.message);
    }
  };

  const loadTasks = async () => {
    try {
      const { data, error } = await supabase
        .from('tasks')
        .select('*, condominios(*)')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      
      const parsedData = (data || []).map(item => {
        let desc = item.descricao || '';
        let level = item.nivel_urgencia;
        
        if (!level) {
          if (desc.endsWith(' [EMERGENCIA]')) {
            desc = desc.substring(0, desc.lastIndexOf(' [EMERGENCIA]'));
            level = 'emergencia';
          } else if (desc.endsWith(' [URGENTE]')) {
            desc = desc.substring(0, desc.lastIndexOf(' [URGENTE]'));
            level = 'urgente';
          } else if (desc.endsWith(' [SEM_URGENCIA]')) {
            desc = desc.substring(0, desc.lastIndexOf(' [SEM_URGENCIA]'));
            level = 'sem_urgencia';
          } else {
            level = item.urgente ? 'urgente' : 'sem_urgencia';
          }
        }
        
        return {
          ...item,
          descricao: desc,
          nivel_urgencia: level
        };
      });
      
      setTasks(parsedData);
    } catch (err) {
      console.error('Error loading tasks:', err);
      Alert.alert('Erro', 'Não foi possível carregar as tarefas: ' + err.message);
    }
  };

  // DD/MM/AAAA -> YYYY-MM-DD
  const parseDateToDb = (dateStr) => {
    if (!dateStr) return null;
    const parts = dateStr.split('/');
    if (parts.length === 3) {
      const day = parts[0].padStart(2, '0');
      const month = parts[1].padStart(2, '0');
      const year = parts[2];
      return `${year}-${month}-${day}`;
    }
    return dateStr;
  };

  // YYYY-MM-DD -> DD/MM/AAAA
  const formatDateToDisplay = (dateStr) => {
    if (!dateStr) return '';
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      const year = parts[0];
      const month = parts[1];
      const day = parts[2];
      return `${day}/${month}/${year}`;
    }
    return dateStr;
  };

  const getUrgencyColor = (item) => {
    const level = item.nivel_urgencia || (item.urgente ? 'urgente' : 'sem_urgencia');
    if (level === 'urgente') return '#FF3B30'; // Vermelho
    if (level === 'emergencia') return '#FFC107'; // Amarelo
    return '#2196F3'; // Azul (Sem urgência)
  };

  const getUrgencyText = (level) => {
    if (level === 'urgente') return 'Urgente';
    if (level === 'emergencia') return 'Emergência';
    return 'Sem Urgência';
  };

  const handleSave = async () => {
    if (!descricao) {
      Alert.alert('Erro', 'Preencha a descrição da tarefa!');
      return;
    }

    if (dataLimite) {
      const parts = dataLimite.split('/');
      if (parts.length !== 3 || parts[0].length > 2 || parts[1].length > 2 || parts[2].length !== 4) {
        Alert.alert('Erro', 'Formato de data inválido! Use DD/MM/AAAA.');
        return;
      }
      const day = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10);
      const year = parseInt(parts[2], 10);
      if (isNaN(day) || isNaN(month) || isNaN(year) || day < 1 || day > 31 || month < 1 || month > 12 || year < 1000) {
        Alert.alert('Erro', 'Data inválida! Use uma data real no formato DD/MM/AAAA.');
        return;
      }
    }

    const formattedDate = parseDateToDb(dataLimite);
    const isUrgenteBoolean = nivelUrgencia === 'urgente' || nivelUrgencia === 'emergencia';

    const taskData = {
      condominio_id: condominioId || null,
      descricao,
      urgente: isUrgenteBoolean,
      nivel_urgencia: nivelUrgencia,
      data_limite: formattedDate,
    };

    try {
      if (editingId) {
        const { error } = await supabase
          .from('tasks')
          .update(taskData)
          .eq('id', editingId);
        if (error) {
          if (error.message.includes('nivel_urgencia') || error.code === 'PGRST204') {
            const fallbackData = { ...taskData };
            delete fallbackData.nivel_urgencia;
            fallbackData.descricao = `${descricao} [${nivelUrgencia.toUpperCase()}]`;
            const { error: fallbackError } = await supabase.from('tasks').update(fallbackData).eq('id', editingId);
            if (fallbackError) throw fallbackError;
          } else {
            throw error;
          }
        }
      } else {
        const { error } = await supabase
          .from('tasks')
          .insert({ ...taskData, user_id: user.id });
        if (error) {
          if (error.message.includes('nivel_urgencia') || error.code === 'PGRST204') {
            const fallbackData = { ...taskData };
            delete fallbackData.nivel_urgencia;
            fallbackData.descricao = `${descricao} [${nivelUrgencia.toUpperCase()}]`;
            const { error: fallbackError } = await supabase.from('tasks').insert({ ...fallbackData, user_id: user.id });
            if (fallbackError) throw fallbackError;
          } else {
            throw error;
          }
        }
      }
      setModalVisible(false);
      setCondominioId('');
      setDescricao('');
      setNivelUrgencia('sem_urgencia');
      setDataLimite('');
      setEditingId(null);
      loadTasks();
    } catch (err) {
      console.error('Error saving task:', err);
      Alert.alert('Erro', 'Não foi possível salvar a tarefa: ' + err.message);
    }
  };

  const handleEdit = (item) => {
    setEditingId(item.id);
    setCondominioId(item.condominio_id || '');
    setDescricao(item.descricao);
    setNivelUrgencia(item.nivel_urgencia || (item.urgente ? 'urgente' : 'sem_urgencia'));
    setDataLimite(formatDateToDisplay(item.data_limite));
    setModalVisible(true);
  };

  const confirmDelete = (item) => {
    setItemToDelete(item);
    setDeleteConfirmVisible(true);
  };

  const executeDelete = async () => {
    if (itemToDelete) {
      await supabase.from('tasks').delete().eq('id', itemToDelete.id);
      setDeleteConfirmVisible(false);
      setItemToDelete(null);
      loadTasks();
    }
  };

  const renderItem = ({ item }) => (
    <TouchableOpacity 
      style={styles.item} 
      onPress={() => handleEdit(item)}
      activeOpacity={0.8}
    >
      <View style={[styles.itemIconContainer, { borderColor: getUrgencyColor(item) }]}>
        <Ionicons name="checkmark-circle-outline" size={24} color={getUrgencyColor(item)} />
      </View>
      <View style={styles.itemContentContainer}>
        <View style={styles.itemContent}>
          {item.condominios?.nome ? (
            <Text style={styles.itemCondo}>{item.condominios.nome}</Text>
          ) : (
            <Text style={[styles.itemCondo, { color: Theme.Colors.textTertiary, fontStyle: 'italic' }]}>Sem Condomínio</Text>
          )}
          <Text style={styles.itemDesc}>{item.descricao}</Text>
          <View style={styles.itemMeta}>
            <Text style={[styles.urgencyTextBadge, { color: getUrgencyColor(item) }]}>
              {getUrgencyText(item.nivel_urgencia || (item.urgente ? 'urgente' : 'sem_urgencia'))}
            </Text>
            {item.data_limite && (
              <Text style={styles.itemDate}>
                Prazo: {formatDateToDisplay(item.data_limite)}
              </Text>
            )}
          </View>
        </View>
        <TouchableOpacity 
          style={styles.deleteIconButton} 
          onPress={(e) => {
            e.stopPropagation();
            confirmDelete(item);
          }}
        >
          <Ionicons name="close" size={24} color="#888888" />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.headerContainer}>
        <Text style={styles.header}>Tare<Text style={styles.headerAccent}>fas</Text></Text>
        <TouchableOpacity 
          style={styles.logoutHeaderButton} 
          onPress={() => navigation.navigate('Home', { openSidebar: true })}
        >
          <Ionicons name="log-out-outline" size={24} color={Theme.Colors.primary} />
        </TouchableOpacity>
      </View>
      
      {tasks.length === 0 ? (
        <View style={styles.emptyState}>
          <View style={styles.emptyIcon}>
            <Ionicons name="checkmark-circle-outline" size={64} color={Theme.Colors.primary} />
          </View>
          <Text style={styles.emptyTitle}>Nenhuma tarefa</Text>
          <Text style={styles.emptySubtitle}>Crie sua primeira tarefa</Text>
          <TouchableOpacity style={styles.centralButton} onPress={() => setModalVisible(true)}>
            <Ionicons name="add" size={20} color={Theme.Colors.primary} />
            <Text style={styles.centralButtonText}>Criar tarefa</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={tasks}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
        />
      )}

      <Modal visible={modalVisible} animationType="slide" onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => {
              setModalVisible(false);
              setEditingId(null);
              setCondominioId('');
              setDescricao('');
              setNivelUrgencia('sem_urgencia');
              setDataLimite('');
            }}>
              <Ionicons name="arrow-back" size={24} color={Theme.Colors.primary} />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>{editingId ? 'Editar' : 'Nova'}</Text>
            <View style={{ width: 24 }} />
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Condomínio</Text>
              <FlatList
                data={condominios}
                horizontal
                showsHorizontalScrollIndicator={false}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={[styles.condoOption, condominioId === item.id && styles.condoOptionSelected]}
                    onPress={() => setCondominioId(condominioId === item.id ? '' : item.id)}
                  >
                    <Text style={[styles.condoOptionText, condominioId === item.id && styles.condoOptionTextSelected]}>
                      {item.nome}
                    </Text>
                  </TouchableOpacity>
                )}
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Descrição</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={descricao}
                onChangeText={setDescricao}
                placeholder="Descrição da tarefa"
                placeholderTextColor={Theme.Colors.textTertiary}
                multiline
                numberOfLines={4}
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Data Limite</Text>
              <TextInput
                style={styles.input}
                value={dataLimite}
                onChangeText={setDataLimite}
                placeholder="DD/MM/AAAA"
                placeholderTextColor={Theme.Colors.textTertiary}
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Nível de Urgência</Text>
              <View style={styles.urgencySelector}>
                <TouchableOpacity 
                  style={[
                    styles.urgencyOption, 
                    nivelUrgencia === 'sem_urgencia' && styles.urgencyOptionSelectedBlue
                  ]} 
                  onPress={() => setNivelUrgencia('sem_urgencia')}
                >
                  <Text style={[styles.urgencyOptionText, nivelUrgencia === 'sem_urgencia' && styles.urgencyOptionTextSelected]}>Sem Urgência</Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={[
                    styles.urgencyOption, 
                    nivelUrgencia === 'emergencia' && styles.urgencyOptionSelectedYellow
                  ]} 
                  onPress={() => setNivelUrgencia('emergencia')}
                >
                  <Text style={[styles.urgencyOptionText, nivelUrgencia === 'emergencia' && styles.urgencyOptionTextSelected]}>Emergência</Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={[
                    styles.urgencyOption, 
                    nivelUrgencia === 'urgente' && styles.urgencyOptionSelectedRed
                  ]} 
                  onPress={() => setNivelUrgencia('urgente')}
                >
                  <Text style={[styles.urgencyOptionText, nivelUrgencia === 'urgente' && styles.urgencyOptionTextSelected]}>Urgente</Text>
                </TouchableOpacity>
              </View>
            </View>

            <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
              <Text style={styles.saveButtonText}>Salvar</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </Modal>

      {/* Botão Flutuante de Cadastro (FAB) */}
      {tasks.length > 0 && (
        <TouchableOpacity 
          style={styles.fab} 
          onPress={() => setModalVisible(true)}
        >
          <Ionicons name="add" size={30} color="#FFFFFF" />
        </TouchableOpacity>
      )}

      {/* Modal Personalizado de Confirmação de Exclusão */}
      <Modal
        visible={deleteConfirmVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setDeleteConfirmVisible(false)}
      >
        <View style={styles.confirmOverlay}>
          <View style={styles.confirmCard}>
            <Text style={styles.confirmTitle}>Confirmar Exclusão</Text>
            <Text style={styles.confirmMessage}>Tem certeza de que deseja excluir este cadastro?</Text>
            
            <View style={styles.confirmButtonsContainer}>
              <TouchableOpacity 
                style={[styles.confirmButton, styles.confirmCancelButton]} 
                onPress={() => setDeleteConfirmVisible(false)}
              >
                <Text style={styles.confirmCancelText}>Cancelar</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.confirmButton, styles.confirmDeleteButton]} 
                onPress={executeDelete}
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
    marginBottom: Theme.Spacing.margin.lg,
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
  newButton: {
    backgroundColor: Theme.Colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Theme.Spacing.padding.md,
    paddingVertical: Theme.Spacing.padding.sm,
    borderRadius: Theme.BorderRadius.md,
    gap: 4,
  },
  newButtonText: {
    color: Theme.Colors.textPrimary,
    fontSize: Theme.Typography.fontSize.body,
    fontWeight: Theme.Typography.fontWeight.bold,
  },
  listContent: {
    paddingBottom: 200,
  },
  itemContentContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  logoutHeaderButton: {
    padding: Theme.Spacing.padding.sm,
  },
  deleteIconButton: {
    padding: Theme.Spacing.padding.md,
  },
  fab: {
    position: 'absolute',
    right: 24,
    bottom: 110, // acima do menu inferior
    width: 56,
    height: 56,
    borderRadius: 16, // quadrado com bordas arredondadas
    backgroundColor: '#444444', // campo cinza
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    zIndex: 99,
  },
  confirmOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Theme.Spacing.padding.xl,
  },
  confirmCard: {
    width: '85%',
    backgroundColor: '#2A2A2A', // Cinza escuro
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
    color: '#CCCCCC', // Fontes cinza claro
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
    backgroundColor: '#444444',
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
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: Theme.Spacing.padding.xxl,
    paddingBottom: 120,
  },
  emptyIcon: {
    width: 120,
    height: 120,
    borderRadius: Theme.BorderRadius.xl,
    backgroundColor: Theme.Colors.cardBackground,
    borderWidth: 2,
    borderColor: Theme.Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Theme.Spacing.margin.lg,
  },
  emptyTitle: {
    fontSize: Theme.Typography.fontSize.title,
    fontWeight: Theme.Typography.fontWeight.bold,
    color: Theme.Colors.textPrimary,
    marginBottom: Theme.Spacing.margin.sm,
  },
  emptySubtitle: {
    fontSize: Theme.Typography.fontSize.body,
    color: Theme.Colors.textSecondary,
    textAlign: 'center',
    marginBottom: Theme.Spacing.margin.xl,
  },
  centralButton: {
    backgroundColor: Theme.Colors.cardBackground,
    borderWidth: 2,
    borderColor: Theme.Colors.primary,
    paddingHorizontal: Theme.Spacing.padding.xl,
    paddingVertical: Theme.Spacing.padding.lg,
    borderRadius: Theme.BorderRadius.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Theme.Spacing.gap.sm,
  },
  centralButtonText: {
    color: Theme.Colors.primary,
    fontSize: Theme.Typography.fontSize.body,
    fontWeight: Theme.Typography.fontWeight.bold,
  },
  item: {
    backgroundColor: Theme.Colors.cardBackground,
    flexDirection: 'row',
    padding: Theme.Spacing.padding.lg,
    borderRadius: Theme.BorderRadius.lg,
    marginBottom: Theme.Spacing.margin.md,
    alignItems: 'center',
    ...Theme.Shadows.card,
  },
  itemIconContainer: {
    width: 56,
    height: 56,
    borderRadius: Theme.BorderRadius.md,
    backgroundColor: Theme.Colors.inputBackground,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Theme.Spacing.margin.md,
  },
  itemContent: {
    flex: 1,
  },
  itemCondo: {
    fontSize: Theme.Typography.fontSize.body,
    fontWeight: Theme.Typography.fontWeight.bold,
    color: Theme.Colors.textPrimary,
    marginBottom: 4,
  },
  itemDesc: {
    fontSize: Theme.Typography.fontSize.body,
    color: Theme.Colors.textPrimary,
    lineHeight: Theme.Typography.lineHeight.normal,
  },
  itemMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: Theme.Spacing.margin.sm,
    gap: Theme.Spacing.gap.md,
  },
  urgencyTextBadge: {
    backgroundColor: Theme.Colors.inputBackground,
    fontSize: Theme.Typography.fontSize.tiny,
    fontWeight: Theme.Typography.fontWeight.bold,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  itemDate: {
    fontSize: Theme.Typography.fontSize.tiny,
    color: Theme.Colors.textSecondary,
  },
  itemActions: {
    flexDirection: 'row',
    gap: Theme.Spacing.gap.sm,
    alignItems: 'center',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: Theme.Colors.background,
    padding: Theme.Spacing.padding.lg,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Theme.Spacing.margin.xl,
    marginTop: Theme.Spacing.margin.xl,
  },
  modalTitle: {
    fontSize: Theme.Typography.fontSize.title,
    fontWeight: Theme.Typography.fontWeight.bold,
    color: Theme.Colors.textPrimary,
  },
  inputContainer: {
    marginBottom: Theme.Spacing.margin.lg,
  },
  label: {
    fontSize: Theme.Typography.fontSize.body,
    color: Theme.Colors.textPrimary,
    marginBottom: Theme.Spacing.margin.sm,
    fontWeight: Theme.Typography.fontWeight.medium,
  },
  input: {
    backgroundColor: Theme.Colors.inputBackground,
    borderWidth: 1,
    borderColor: Theme.Colors.border,
    borderRadius: Theme.BorderRadius.md,
    padding: Theme.Spacing.padding.lg,
    fontSize: Theme.Typography.fontSize.body,
    color: Theme.Colors.textPrimary,
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  condoOption: {
    backgroundColor: Theme.Colors.cardBackground,
    paddingHorizontal: Theme.Spacing.padding.md,
    paddingVertical: Theme.Spacing.padding.md,
    borderRadius: Theme.BorderRadius.md,
    marginRight: Theme.Spacing.margin.md,
    borderWidth: 2,
    borderColor: Theme.Colors.border,
  },
  condoOptionSelected: {
    borderColor: Theme.Colors.primary,
  },
  condoOptionText: {
    fontSize: Theme.Typography.fontSize.small,
    color: Theme.Colors.textSecondary,
  },
  condoOptionTextSelected: {
    color: Theme.Colors.primary,
    fontWeight: Theme.Typography.fontWeight.bold,
  },
  urgencySelector: {
    flexDirection: 'row',
    gap: Theme.Spacing.gap.sm,
    marginTop: Theme.Spacing.margin.xs,
  },
  urgencyOption: {
    flex: 1,
    paddingVertical: Theme.Spacing.padding.md,
    borderRadius: Theme.BorderRadius.md,
    backgroundColor: Theme.Colors.inputBackground,
    borderWidth: 1,
    borderColor: Theme.Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  urgencyOptionText: {
    fontSize: Theme.Typography.fontSize.tiny,
    fontWeight: Theme.Typography.fontWeight.medium,
    color: Theme.Colors.textSecondary,
    textAlign: 'center',
  },
  urgencyOptionTextSelected: {
    color: '#FFFFFF',
    fontWeight: Theme.Typography.fontWeight.bold,
  },
  urgencyOptionSelectedBlue: {
    backgroundColor: '#2196F3',
    borderColor: '#2196F3',
  },
  urgencyOptionSelectedYellow: {
    backgroundColor: '#FFC107',
    borderColor: '#FFC107',
  },
  urgencyOptionSelectedRed: {
    backgroundColor: '#FF3B30',
    borderColor: '#FF3B30',
  },
  saveButton: {
    backgroundColor: Theme.Colors.primary,
    padding: Theme.Spacing.padding.lg,
    borderRadius: Theme.BorderRadius.md,
    alignItems: 'center',
    marginTop: Theme.Spacing.margin.xl,
  },
  saveButtonText: {
    color: Theme.Colors.textPrimary,
    fontSize: Theme.Typography.fontSize.body,
    fontWeight: Theme.Typography.fontWeight.bold,
  },
});
