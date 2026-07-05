import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, FlatList, Alert, Modal, Image, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useFocusEffect } from '@react-navigation/native';
import { supabase } from '../config/supabase';
import { useAuth } from '../context/AuthContext';
import { Theme } from '../theme/theme';

export default function ComunicadosScreen({ navigation }) {
  const { user } = useAuth();
  const [comunicados, setComunicados] = useState([]);
  const [condominios, setCondominios] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [condominioId, setCondominioId] = useState('');
  const [descricao, setDescricao] = useState('');
  const [image, setImage] = useState(null);
  const [deleteConfirmVisible, setDeleteConfirmVisible] = useState(false);
  const [itemToDelete, setItemToDelete] = useState(null);

  useFocusEffect(
    React.useCallback(() => {
      loadComunicados();
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

  const loadComunicados = async () => {
    try {
      const { data, error } = await supabase
        .from('comunicados')
        .select('*, condominios(*)')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      setComunicados(data || []);
    } catch (err) {
      console.error('Error loading comunicados:', err);
      Alert.alert('Erro', 'Não foi possível carregar os comunicados: ' + err.message);
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
    if (!descricao) {
      Alert.alert('Erro', 'Preencha a descrição!');
      return;
    }

    let imageUrl = null;
    if (image && !image.startsWith('http')) {
      const fileName = `${Date.now()}.jpg`;
      try {
        const response = await fetch(image);
        const blob = await response.blob();
        const { error: uploadError } = await supabase.storage
          .from('comunicados')
          .upload(fileName, blob, {
            contentType: 'image/jpeg',
          });
        if (!uploadError) {
          const { data: urlData } = supabase.storage.from('comunicados').getPublicUrl(fileName);
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

    try {
      if (editingId) {
        const { error } = await supabase
          .from('comunicados')
          .update({ condominio_id: condominioId || null, descricao, image_url: imageUrl })
          .eq('id', editingId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('comunicados')
          .insert({ condominio_id: condominioId || null, descricao, image_url: imageUrl, user_id: user.id });
        if (error) throw error;
      }
      setModalVisible(false);
      setCondominioId('');
      setDescricao('');
      setImage(null);
      setEditingId(null);
      loadComunicados();
    } catch (err) {
      console.error('Error saving comunicado:', err);
      Alert.alert('Erro', 'Não foi possível salvar o comunicado: ' + err.message);
    }
  };

  const handleEdit = (item) => {
    setEditingId(item.id);
    setCondominioId(item.condominio_id || '');
    setDescricao(item.descricao);
    setImage(item.image_url);
    setModalVisible(true);
  };

  const confirmDelete = (item) => {
    setItemToDelete(item);
    setDeleteConfirmVisible(true);
  };

  const executeDelete = async () => {
    if (itemToDelete) {
      await supabase.from('comunicados').delete().eq('id', itemToDelete.id);
      setDeleteConfirmVisible(false);
      setItemToDelete(null);
      loadComunicados();
    }
  };

  const renderItem = ({ item }) => (
    <TouchableOpacity 
      style={styles.itemContainer} 
      onPress={() => handleEdit(item)}
      activeOpacity={0.8}
    >
      <View style={[
        styles.itemCardPart,
        item.image_url && { borderBottomLeftRadius: 0, borderBottomRightRadius: 0 }
      ]}>
        <View style={styles.itemIconContainer}>
          <Ionicons name="megaphone-outline" size={24} color={Theme.Colors.primary} />
        </View>
        <View style={styles.itemContentContainer}>
          <View style={styles.itemContent}>
            <Text style={styles.itemCondo}>{item.condominios?.nome || 'Geral (Sem Condomínio)'}</Text>
            <Text style={styles.itemDesc}>{item.descricao}</Text>
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
      </View>
      {item.image_url && (
        <Image source={{ uri: item.image_url }} style={styles.itemAttachedImage} />
      )}
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.headerContainer}>
        <Text style={styles.header}>Comunica<Text style={styles.headerAccent}>dos</Text></Text>
        <TouchableOpacity 
          style={styles.logoutHeaderButton} 
          onPress={() => navigation.navigate('Home', { openSidebar: true })}
        >
          <Ionicons name="log-out-outline" size={24} color={Theme.Colors.primary} />
        </TouchableOpacity>
      </View>
      
      {comunicados.length === 0 ? (
        <View style={styles.emptyState}>
          <View style={styles.emptyIcon}>
            <Ionicons name="megaphone-outline" size={64} color={Theme.Colors.primary} />
          </View>
          <Text style={styles.emptyTitle}>Nenhum comunicado</Text>
          <Text style={styles.emptySubtitle}>Crie seu primeiro comunicado</Text>
          <TouchableOpacity style={styles.centralButton} onPress={() => setModalVisible(true)}>
            <Ionicons name="add" size={20} color={Theme.Colors.primary} />
            <Text style={styles.centralButtonText}>Criar comunicado</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={comunicados}
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
              setImage(null);
            }}>
              <Ionicons name="arrow-back" size={24} color={Theme.Colors.primary} />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>{editingId ? 'Editar' : 'Novo'}</Text>
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
                placeholder="Descrição do comunicado"
                placeholderTextColor={Theme.Colors.textTertiary}
                multiline
                numberOfLines={4}
              />
            </View>

            <View style={styles.inputContainer}>
              <TouchableOpacity 
                style={[
                  styles.imageButton,
                  image && { borderBottomLeftRadius: 0, borderBottomRightRadius: 0, borderBottomWidth: 0 }
                ]} 
                onPress={pickImage}
              >
                <Ionicons name="camera-outline" size={24} color={Theme.Colors.primary} />
                <Text style={styles.imageButtonText}>Adicionar Foto</Text>
              </TouchableOpacity>
              {image && <Image source={{ uri: image }} style={styles.previewImage} />}
            </View>

            <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
              <Text style={styles.saveButtonText}>Salvar</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </Modal>

      {/* Botão Flutuante de Cadastro (FAB) */}
      {comunicados.length > 0 && (
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
    paddingBottom: 100,
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
  itemContainer: {
    marginBottom: Theme.Spacing.margin.md,
  },
  itemCardPart: {
    backgroundColor: Theme.Colors.cardBackground,
    flexDirection: 'row',
    padding: Theme.Spacing.padding.lg,
    borderTopLeftRadius: Theme.BorderRadius.lg,
    borderTopRightRadius: Theme.BorderRadius.lg,
    borderBottomLeftRadius: Theme.BorderRadius.lg,
    borderBottomRightRadius: Theme.BorderRadius.lg,
    alignItems: 'flex-start',
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
  },
  itemContent: {
    flex: 1,
    paddingRight: Theme.Spacing.padding.md,
  },
  itemCondo: {
    fontSize: Theme.Typography.fontSize.body,
    fontWeight: Theme.Typography.fontWeight.bold,
    color: Theme.Colors.primary,
    marginBottom: 4,
  },
  itemDesc: {
    fontSize: Theme.Typography.fontSize.body,
    color: Theme.Colors.textPrimary,
    lineHeight: Theme.Typography.lineHeight.normal,
  },
  itemAttachedImage: {
    width: '100%',
    height: 150,
    borderBottomLeftRadius: Theme.BorderRadius.lg,
    borderBottomRightRadius: Theme.BorderRadius.lg,
    resizeMode: 'cover',
    ...Theme.Shadows.card,
  },
  itemDate: {
    fontSize: Theme.Typography.fontSize.tiny,
    color: Theme.Colors.textSecondary,
    marginTop: Theme.Spacing.margin.sm,
  },
  itemActions: {
    flexDirection: 'row',
    gap: Theme.Spacing.gap.lg,
    paddingHorizontal: Theme.Spacing.padding.lg,
    paddingBottom: Theme.Spacing.padding.lg,
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
  imageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Theme.Colors.cardBackground,
    padding: Theme.Spacing.padding.lg,
    borderRadius: Theme.BorderRadius.md,
    borderWidth: 1,
    borderColor: Theme.Colors.border,
    gap: Theme.Spacing.gap.md,
  },
  imageButtonText: {
    fontSize: Theme.Typography.fontSize.body,
    color: Theme.Colors.primary,
    fontWeight: Theme.Typography.fontWeight.medium,
  },
  previewImage: {
    width: '100%',
    height: 200,
    borderBottomLeftRadius: Theme.BorderRadius.md,
    borderBottomRightRadius: Theme.BorderRadius.md,
    borderWidth: 1,
    borderColor: Theme.Colors.border,
    borderTopWidth: 0,
    marginTop: 0,
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
  listContent: {
    paddingBottom: 200,
  },
  itemContentContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingRight: Theme.Spacing.padding.md,
    flex: 1,
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
});
