import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, FlatList, Alert, Modal, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from '../config/supabase';
import { useAuth } from '../context/AuthContext';
import { Theme } from '../theme/theme';

export default function OrcamentosScreen({ navigation }) {
  const { user } = useAuth();
  const [orcamentos, setOrcamentos] = useState([]);
  const [condominios, setCondominios] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [condominioId, setCondominioId] = useState('');
  const [descricao, setDescricao] = useState('');
  const [valor, setValor] = useState('');
  const [image, setImage] = useState(null);
  const [deleteConfirmVisible, setDeleteConfirmVisible] = useState(false);
  const [itemToDelete, setItemToDelete] = useState(null);

  useEffect(() => {
    loadOrcamentos();
    loadCondominios();
  }, []);

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

  const loadOrcamentos = async () => {
    try {
      const { data, error } = await supabase
        .from('orcamentos')
        .select('*, condominios(*)')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      setOrcamentos(data || []);
    } catch (err) {
      console.error('Error loading orcamentos:', err);
      Alert.alert('Erro', 'Não foi possível carregar os orçamentos: ' + err.message);
    }
  };

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permissão necessária', 'Precisamos de acesso à galeria para selecionar uma foto.');
      return;
    }

    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });

    if (!result.canceled) {
      setImage(result.assets[0].uri);
    }
  };

  const handleSave = async () => {
    if (!condominioId || !descricao || !valor) {
      Alert.alert('Erro', 'Preencha todos os campos!');
      return;
    }

    let imageUrl = null;
    if (image && !image.startsWith('http')) {
      const fileName = `${Date.now()}.jpg`;
      try {
        const response = await fetch(image);
        const blob = await response.blob();
        const { error: uploadError } = await supabase.storage
          .from('orcamentos')
          .upload(fileName, blob, {
            contentType: 'image/jpeg',
          });
        if (!uploadError) {
          const { data: urlData } = supabase.storage.from('orcamentos').getPublicUrl(fileName);
          imageUrl = urlData.publicUrl;
        } else {
          throw uploadError;
        }
      } catch (err) {
        console.error('Erro no upload da imagem:', err);
        Alert.alert('Erro', 'Não foi possível enviar a imagem: ' + err.message);
        return;
      }
    } else {
      imageUrl = image;
    }

    const orcamentoData = {
      condominio_id: condominioId,
      descricao,
      valor: parseFloat(valor) || 0,
      image_url: imageUrl,
    };

    try {
      if (editingId) {
        const { error } = await supabase
          .from('orcamentos')
          .update(orcamentoData)
          .eq('id', editingId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('orcamentos')
          .insert({ ...orcamentoData, user_id: user.id });
        if (error) throw error;
      }
      setModalVisible(false);
      setCondominioId('');
      setDescricao('');
      setValor('');
      setImage(null);
      setEditingId(null);
      loadOrcamentos();
    } catch (err) {
      console.error('Error saving orcamento:', err);
      Alert.alert('Erro', 'Não foi possível salvar o orçamento: ' + err.message);
    }
  };

  const handleEdit = (item) => {
    setEditingId(item.id);
    setCondominioId(item.condominio_id);
    setDescricao(item.descricao);
    setValor(item.valor?.toString() || '');
    setImage(item.image_url);
    setModalVisible(true);
  };

  const confirmDelete = (item) => {
    setItemToDelete(item);
    setDeleteConfirmVisible(true);
  };

  const executeDelete = async () => {
    if (itemToDelete) {
      await supabase.from('orcamentos').delete().eq('id', itemToDelete.id);
      setDeleteConfirmVisible(false);
      setItemToDelete(null);
      loadOrcamentos();
    }
  };

  const renderItem = ({ item }) => (
    <TouchableOpacity 
      style={styles.item} 
      onPress={() => handleEdit(item)}
      activeOpacity={0.8}
    >
      <View style={styles.itemIconContainer}>
        {item.image_url ? (
          <Image source={{ uri: item.image_url }} style={styles.itemIconImage} />
        ) : (
          <Ionicons name="wallet-outline" size={24} color={Theme.Colors.primary} />
        )}
      </View>
      <View style={styles.itemContentContainer}>
        <View style={styles.itemContent}>
          <Text style={styles.itemCondo}>{item.condominios?.nome}</Text>
          <Text style={styles.itemDesc}>{item.descricao}</Text>
          {item.valor > 0 && (
            <Text style={styles.itemValue}>R$ {item.valor.toFixed(2)}</Text>
          )}
          <Text style={styles.itemDate}>
            {new Date(item.created_at).toLocaleDateString('pt-BR')}
          </Text>
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
        <Text style={styles.header}>Orçamen<Text style={styles.headerAccent}>tos</Text></Text>
        <TouchableOpacity 
          style={styles.logoutHeaderButton} 
          onPress={() => navigation.navigate('Home', { openSidebar: true })}
        >
          <Ionicons name="log-out-outline" size={24} color={Theme.Colors.primary} />
        </TouchableOpacity>
      </View>
      
      {orcamentos.length === 0 ? (
        <View style={styles.emptyState}>
          <View style={styles.emptyIcon}>
            <Ionicons name="wallet-outline" size={64} color={Theme.Colors.primary} />
          </View>
          <Text style={styles.emptyTitle}>Nenhum orçamento</Text>
          <Text style={styles.emptySubtitle}>Crie seu primeiro orçamento</Text>
          <TouchableOpacity style={styles.centralButton} onPress={() => setModalVisible(true)}>
            <Ionicons name="add" size={20} color={Theme.Colors.primary} />
            <Text style={styles.centralButtonText}>Criar orçamento</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={orcamentos}
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
              setValor('');
              setImage(null);
            }}>
              <Ionicons name="arrow-back" size={24} color={Theme.Colors.primary} />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>{editingId ? 'Editar' : 'Novo'}</Text>
            <View style={{ width: 24 }} />
          </View>

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
                  onPress={() => setCondominioId(item.id)}
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
              placeholder="Descrição do orçamento"
              placeholderTextColor={Theme.Colors.textTertiary}
              multiline
              numberOfLines={4}
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Valor</Text>
            <TextInput
              style={styles.input}
              value={valor}
              onChangeText={setValor}
              placeholder="0.00"
              placeholderTextColor={Theme.Colors.textTertiary}
              keyboardType="decimal-pad"
            />
          </View>

          <View style={styles.inputContainer}>
            <TouchableOpacity style={styles.imageButton} onPress={pickImage}>
              <Ionicons name="camera-outline" size={24} color={Theme.Colors.primary} />
              <Text style={styles.imageButtonText}>Adicionar Foto</Text>
            </TouchableOpacity>
            {image && <Image source={{ uri: image }} style={styles.previewImage} />}
          </View>

          <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
            <Text style={styles.saveButtonText}>Salvar</Text>
          </TouchableOpacity>
        </View>
      </Modal>

      {/* Botão Flutuante de Cadastro (FAB) */}
      {orcamentos.length > 0 && (
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
  logoutHeaderButton: {
    padding: 4,
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
    overflow: 'hidden',
  },
  itemIconImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  itemContentContainer: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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
    fontSize: Theme.Typography.fontSize.small,
    color: Theme.Colors.textSecondary,
    marginBottom: 4,
  },
  itemValue: {
    fontSize: Theme.Typography.fontSize.body,
    fontWeight: Theme.Typography.fontWeight.semiBold,
    color: Theme.Colors.primary,
    marginBottom: 4,
  },
  itemDate: {
    fontSize: Theme.Typography.fontSize.tiny,
    color: Theme.Colors.textTertiary,
  },
  deleteIconButton: {
    padding: 8,
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
  imageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Theme.Colors.inputBackground,
    borderWidth: 1,
    borderColor: Theme.Colors.border,
    borderRadius: Theme.BorderRadius.md,
    padding: Theme.Spacing.padding.lg,
    gap: Theme.Spacing.gap.sm,
  },
  imageButtonText: {
    color: Theme.Colors.textPrimary,
    fontSize: Theme.Typography.fontSize.body,
  },
  previewImage: {
    width: '100%',
    height: 200,
    borderRadius: Theme.BorderRadius.md,
    marginTop: Theme.Spacing.margin.md,
    resizeMode: 'cover',
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
  condoOption: {
    backgroundColor: Theme.Colors.cardBackground,
    paddingHorizontal: Theme.Spacing.padding.lg,
    paddingVertical: Theme.Spacing.padding.md,
    borderRadius: Theme.BorderRadius.md,
    marginRight: Theme.Spacing.margin.md,
    borderWidth: 1,
    borderColor: Theme.Colors.border,
  },
  condoOptionSelected: {
    borderColor: Theme.Colors.primary,
    backgroundColor: 'rgba(69, 176, 88, 0.1)',
  },
  condoOptionText: {
    color: Theme.Colors.textSecondary,
    fontSize: Theme.Typography.fontSize.body,
  },
  condoOptionTextSelected: {
    color: Theme.Colors.primary,
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
});
