import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, FlatList, Alert, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../config/supabase';
import { useAuth } from '../context/AuthContext';
import { Theme } from '../theme/theme';

export default function CondominioScreen({ navigation }) {
  const { user } = useAuth();
  const [condominios, setCondominios] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [nome, setNome] = useState('');
  const [endereco, setEndereco] = useState('');
  const [descricao, setDescricao] = useState('');
  
  // Custom Delete Confirmation Modal
  const [deleteConfirmVisible, setDeleteConfirmVisible] = useState(false);
  const [idToDelete, setIdToDelete] = useState(null);

  // Search Filter
  const [search, setSearch] = useState('');

  useEffect(() => {
    loadCondominios();
  }, []);

  const loadCondominios = async () => {
    const { data } = await supabase
      .from('condominios')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    setCondominios(data || []);
  };

  const handleSave = async () => {
    if (!nome) {
      Alert.alert('Erro', 'Preencha o nome do condomínio!');
      return;
    }

    if (editingId) {
      await supabase
        .from('condominios')
        .update({ nome, endereco, descricao })
        .eq('id', editingId);
    } else {
      await supabase
        .from('condominios')
        .insert({ nome, endereco, descricao, user_id: user.id });
    }
    setModalVisible(false);
    setNome('');
    setEndereco('');
    setDescricao('');
    setEditingId(null);
    loadCondominios();
  };

  const handleEdit = (item) => {
    setEditingId(item.id);
    setNome(item.nome);
    setEndereco(item.endereco);
    setDescricao(item.descricao);
    setModalVisible(true);
  };

  const confirmDelete = (id) => {
    setIdToDelete(id);
    setDeleteConfirmVisible(true);
  };

  const executeDelete = async () => {
    if (idToDelete) {
      await supabase.from('condominios').delete().eq('id', idToDelete);
      setDeleteConfirmVisible(false);
      setIdToDelete(null);
      loadCondominios();
    }
  };

  const filteredCondominios = condominios.filter(item => {
    const query = search.toLowerCase();
    return (
      item.nome.toLowerCase().includes(query) ||
      (item.endereco && item.endereco.toLowerCase().includes(query))
    );
  });

  const renderItem = ({ item }) => (
    <TouchableOpacity style={styles.item} onPress={() => handleEdit(item)}>
      <View style={styles.itemIconContainer}>
        <Ionicons name="business-outline" size={24} color={Theme.Colors.primary} />
      </View>
      <View style={styles.itemContent}>
        <Text style={styles.itemName}>{item.nome}</Text>
        {item.endereco && (
          <View style={styles.itemDetail}>
            <Ionicons name="location-outline" size={14} color={Theme.Colors.textSecondary} />
            <Text style={styles.itemAddress}>{item.endereco}</Text>
          </View>
        )}
        {item.descricao && (
          <View style={styles.itemDetail}>
            <Ionicons name="document-text-outline" size={14} color={Theme.Colors.textSecondary} />
            <Text style={styles.itemDesc}>{item.descricao}</Text>
          </View>
        )}
      </View>
      <TouchableOpacity style={styles.deleteButton} onPress={() => confirmDelete(item.id)}>
        <Ionicons name="close" size={24} color="#888888" />
      </TouchableOpacity>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.headerContainer}>
        <View style={{ width: 24 }} />
        <Text style={styles.header}>Condomín<Text style={styles.headerAccent}>ios</Text></Text>
        <TouchableOpacity style={styles.logoutButton} onPress={() => navigation.navigate('Home', { openSidebar: true })}>
          <Ionicons name="log-out-outline" size={24} color={Theme.Colors.primary} />
        </TouchableOpacity>
      </View>
      
      <View style={styles.searchBar}>
        <Ionicons name="search" size={20} color={Theme.Colors.primary} />
        <TextInput
          style={styles.searchInput}
          placeholder="Buscar condomínios..."
          placeholderTextColor={Theme.Colors.textTertiary}
          value={search}
          onChangeText={setSearch}
        />
      </View>
      
      {condominios.length === 0 ? (
        <View style={styles.emptyState}>
          <View style={styles.emptyIcon}>
            <Ionicons name="business-outline" size={64} color={Theme.Colors.primary} />
          </View>
          <Text style={styles.emptyTitle}>Nenhum condomínio</Text>
          <Text style={styles.emptySubtitle}>Gerencie os condomínios cadastrados.</Text>
          <TouchableOpacity style={styles.centralButton} onPress={() => setModalVisible(true)}>
            <Text style={styles.centralButtonText}>Criar condomínio</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={filteredCondominios}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
        />
      )}

      {/* FAB - Só aparece se já houver pelo menos um condomínio cadastrado */}
      {condominios.length > 0 && (
        <TouchableOpacity style={styles.fab} onPress={() => setModalVisible(true)}>
          <Ionicons name="add" size={30} color="#FFFFFF" />
        </TouchableOpacity>
      )}

      {/* Modal de Cadastro/Edição */}
      <Modal visible={modalVisible} animationType="slide" onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => {
              setModalVisible(false);
              setEditingId(null);
              setNome('');
              setEndereco('');
              setDescricao('');
            }}>
              <Ionicons name="arrow-back" size={24} color={Theme.Colors.primary} />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>{editingId ? 'Editar' : 'Novo'}</Text>
            <View style={{ width: 24 }} />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Nome</Text>
            <TextInput 
              style={styles.input} 
              value={nome} 
              onChangeText={setNome} 
              placeholder="Nome do condomínio"
              placeholderTextColor={Theme.Colors.textTertiary}
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Endereço</Text>
            <TextInput 
              style={styles.input} 
              value={endereco} 
              onChangeText={setEndereco} 
              placeholder="Endereço"
              placeholderTextColor={Theme.Colors.textTertiary}
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Descrição</Text>
            <TextInput 
              style={[styles.input, styles.textArea]} 
              value={descricao} 
              onChangeText={setDescricao} 
              placeholder="Descrição"
              placeholderTextColor={Theme.Colors.textTertiary}
              multiline
            />
          </View>

          <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
            <Text style={styles.saveButtonText}>Salvar</Text>
          </TouchableOpacity>
        </View>
      </Modal>

      {/* Modal de Confirmação de Exclusão */}
      <Modal
        visible={deleteConfirmVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setDeleteConfirmVisible(false)}
      >
        <View style={styles.confirmOverlay}>
          <View style={styles.confirmCard}>
            <Text style={styles.confirmTitle}>Confirmar Exclusão</Text>
            <Text style={styles.confirmMessage}>Tem certeza que deseja excluir? Isso apagará do banco de dados também.</Text>
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
  logoutButton: {
    padding: 4,
  },
  searchBar: {
    backgroundColor: Theme.Colors.inputBackground,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Theme.Spacing.padding.lg,
    paddingVertical: Theme.Spacing.padding.md,
    borderRadius: Theme.BorderRadius.full,
    marginBottom: Theme.Spacing.margin.lg,
    gap: Theme.Spacing.gap.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: Theme.Typography.fontSize.body,
    color: Theme.Colors.textPrimary,
  },
  listContent: {
    paddingBottom: 200,
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
    borderWidth: 1,
    borderColor: Theme.Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Theme.Spacing.margin.md,
  },
  itemContent: {
    flex: 1,
  },
  itemName: {
    fontSize: Theme.Typography.fontSize.body,
    fontWeight: Theme.Typography.fontWeight.bold,
    color: Theme.Colors.textPrimary,
    marginBottom: 4,
  },
  itemDetail: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  itemAddress: {
    fontSize: Theme.Typography.fontSize.small,
    color: Theme.Colors.textSecondary,
  },
  itemDesc: {
    fontSize: Theme.Typography.fontSize.small,
    color: Theme.Colors.textSecondary,
  },
  deleteButton: {
    padding: 8,
    justifyContent: 'center',
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
  fab: {
    position: 'absolute',
    right: 24,
    bottom: 90, // flutuando acima do bottom tab navigator
    width: 56,
    height: 56,
    borderRadius: 12, // quadrado com cantos arredondados
    backgroundColor: '#444444', // cor cinza da aplicação
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4.65,
    elevation: 8,
    zIndex: 999,
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
    backgroundColor: '#2A2A2A', // Fundo cinza escuro
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
    backgroundColor: '#555555', // Cinza escuro
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
});
