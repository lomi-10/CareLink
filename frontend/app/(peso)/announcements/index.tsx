import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator, Image, Modal, ScrollView, Text, TextInput, TouchableOpacity, View,
} from 'react-native';
import { announcementImageUrl, deleteAnnouncement, fetchPesoAnnouncements, publishAnnouncement, updateAnnouncement, type Announcement } from '@/lib/announcementsApi';
import { AnnouncementPostCard } from '@/components/shared/AnnouncementPostCard';
import { ScreenHeader, PButton, usePesoTheme, font, radius, space } from '@/components/peso/ui';

export default function PesoAnnouncementsScreen() {
  const { c } = usePesoTheme();
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [image, setImage] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const [items, setItems] = useState<Announcement[]>([]);
  const [editing, setEditing] = useState<Announcement | null>(null);
  const [removeCurrentImage, setRemoveCurrentImage] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Announcement | null>(null);
  const [loading, setLoading] = useState(true);
  const [publishing, setPublishing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      setItems(await fetchPesoAnnouncements());
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not load announcements.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const chooseImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [16, 9],
      quality: 0.8,
    });
    if (!result.canceled) {
      setImage(result.assets[0] ?? null);
      setRemoveCurrentImage(false);
    }
  };

  const clearComposer = () => {
    setTitle('');
    setBody('');
    setImage(null);
    setEditing(null);
    setRemoveCurrentImage(false);
  };

  const startEditing = (item: Announcement) => {
    setEditing(item);
    setTitle(item.title);
    setBody(item.body);
    setImage(null);
    setRemoveCurrentImage(false);
    setError(null);
    setSuccess(null);
  };

  const save = async () => {
    setError(null);
    setSuccess(null);
    if (!title.trim() || !body.trim()) {
      setError('Add both a title and announcement message.');
      return;
    }
    setPublishing(true);
    try {
      const selectedImage = image ? {
        uri: image.uri,
        fileName: image.fileName,
        mimeType: image.mimeType,
        file: image.file,
      } : undefined;
      if (editing) {
        await updateAnnouncement(editing.announcement_id, title, body, {
          image: selectedImage,
          removeImage: removeCurrentImage,
        });
        setSuccess('Announcement updated.');
      } else {
        await publishAnnouncement(title, body, selectedImage);
        setSuccess('Announcement published to helper and employer dashboards.');
      }
      clearComposer();
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not publish announcement.');
    } finally {
      setPublishing(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    const target = deleteTarget;
    setDeleteTarget(null);
    setError(null);
    setSuccess(null);
    try {
      await deleteAnnouncement(target.announcement_id);
      if (editing?.announcement_id === target.announcement_id) clearComposer();
      setSuccess('Announcement deleted.');
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not delete announcement.');
    }
  };

  const fieldStyle = {
    backgroundColor: c.sunken,
    color: c.ink,
    borderWidth: 1,
    borderColor: c.line,
    borderRadius: radius.md,
    paddingHorizontal: 13,
    paddingVertical: 12,
    fontFamily: font.regular,
    fontSize: 14,
  } as const;

  return (
    <View style={{ flex: 1, backgroundColor: 'transparent' }}>
      <ScreenHeader
        eyebrow="PESO Portal"
        title="Announcements"
        subtitle="Share important updates with helpers and employers."
        right={<Ionicons name="megaphone" size={22} color={c.accent} />}
      />
      <ScrollView contentContainerStyle={{ padding: space.xl, paddingBottom: 48, gap: space.xl }} keyboardShouldPersistTaps="handled">
        <View style={{ maxWidth: 900, width: '100%', alignSelf: 'center', gap: space.md }}>
          <View style={{ backgroundColor: c.surface, borderWidth: 1, borderColor: c.line, borderRadius: radius.lg, padding: space.lg, gap: 14 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
              <Text style={{ fontFamily: font.display, color: c.ink, fontSize: 19 }}>
                {editing ? 'Edit announcement' : 'Create announcement'}
              </Text>
              {editing ? (
                <TouchableOpacity onPress={clearComposer} style={{ flexDirection: 'row', alignItems: 'center', gap: 5, padding: 6 }}>
                  <Ionicons name="close-circle-outline" size={17} color={c.muted} />
                  <Text style={{ fontFamily: font.semibold, color: c.muted, fontSize: 12 }}>Cancel edit</Text>
                </TouchableOpacity>
              ) : null}
            </View>
            <View>
              <Text style={{ fontFamily: font.semibold, color: c.ink, fontSize: 15, marginBottom: 7 }}>Announcement title</Text>
              <TextInput
                value={title}
                onChangeText={setTitle}
                maxLength={160}
                placeholder="e.g. Upcoming PESO registration"
                placeholderTextColor={c.subtle}
                style={fieldStyle}
              />
              <Text style={{ fontFamily: font.regular, color: c.subtle, fontSize: 11, textAlign: 'right', marginTop: 4 }}>{title.length}/160</Text>
            </View>

            <View>
              <Text style={{ fontFamily: font.semibold, color: c.ink, fontSize: 15, marginBottom: 7 }}>Message</Text>
              <TextInput
                value={body}
                onChangeText={setBody}
                maxLength={5000}
                multiline
                textAlignVertical="top"
                placeholder="Write the update helpers and employers should know."
                placeholderTextColor={c.subtle}
                style={[fieldStyle, { minHeight: 130 }]}
              />
              <Text style={{ fontFamily: font.regular, color: c.subtle, fontSize: 11, textAlign: 'right', marginTop: 4 }}>{body.length}/5000</Text>
            </View>

            {image ? (
              <View style={{ gap: 8 }}>
                <Image source={{ uri: image.uri }} resizeMode="cover" style={{ width: '100%', height: 220, borderRadius: radius.md, backgroundColor: c.sunken }} />
                <TouchableOpacity onPress={() => {
                  setImage(null);
                  setRemoveCurrentImage(!!editing?.image_path);
                }} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', paddingVertical: 5 }}>
                  <Ionicons name="trash-outline" size={16} color={c.bad} />
                  <Text style={{ fontFamily: font.semibold, color: c.bad, fontSize: 12 }}>Remove image</Text>
                </TouchableOpacity>
              </View>
            ) : editing?.image_path && !removeCurrentImage ? (
              <View style={{ gap: 8 }}>
                <Image source={{ uri: announcementImageUrl(editing.image_path) ?? undefined }} resizeMode="cover" style={{ width: '100%', height: 220, borderRadius: radius.md, backgroundColor: c.sunken }} />
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 18 }}>
                  <TouchableOpacity onPress={() => void chooseImage()} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 5 }}>
                    <Ionicons name="image-outline" size={16} color={c.accent} />
                    <Text style={{ fontFamily: font.semibold, color: c.accent, fontSize: 12 }}>Replace image</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => setRemoveCurrentImage(true)} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 5 }}>
                    <Ionicons name="trash-outline" size={16} color={c.bad} />
                    <Text style={{ fontFamily: font.semibold, color: c.bad, fontSize: 12 }}>Remove current image</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <TouchableOpacity onPress={() => void chooseImage()} activeOpacity={0.8}
                style={{ minHeight: 68, borderRadius: radius.md, borderWidth: 1, borderStyle: 'dashed', borderColor: c.lineStrong, backgroundColor: c.sunken, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9 }}>
                <Ionicons name="image-outline" size={20} color={c.accent} />
                <Text style={{ fontFamily: font.semibold, color: c.ink, fontSize: 13 }}>Add an optional photo</Text>
              </TouchableOpacity>
            )}

            <Text style={{ fontFamily: font.regular, color: c.muted, fontSize: 12, lineHeight: 18 }}>
              This will be visible on helper and employer dashboards. JPG, PNG, GIF, WebP, BMP, TIFF, AVIF, HEIC, and HEIF images are supported (up to 5 MB).
            </Text>
            {error ? <Text accessibilityRole="alert" style={{ color: c.bad, fontFamily: font.semibold, fontSize: 13 }}>{error}</Text> : null}
            {success ? <Text style={{ color: c.ok, fontFamily: font.semibold, fontSize: 13 }}>{success}</Text> : null}
            <PButton label={editing ? 'Save changes' : 'Publish announcement'} icon={editing ? 'save-outline' : 'megaphone'} onPress={() => void save()} loading={publishing} disabled={!title.trim() || !body.trim()} />
          </View>

          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
            <Text style={{ fontFamily: font.display, fontSize: 20, color: c.ink }}>Recently published</Text>
            <TouchableOpacity onPress={() => void load()} accessibilityLabel="Refresh announcements" hitSlop={8}>
              <Ionicons name="refresh-outline" size={20} color={c.accent} />
            </TouchableOpacity>
          </View>
          {loading ? <ActivityIndicator size="large" color={c.accent} /> : error && items.length === 0 ? (
            <Text style={{ fontFamily: font.regular, color: c.bad, fontSize: 13 }}>{error}</Text>
          ) : items.length === 0 ? (
            <Text style={{ fontFamily: font.regular, color: c.muted, fontSize: 13 }}>No announcements published yet.</Text>
          ) : items.map((item) => (
            <View key={item.announcement_id} style={{ gap: 8 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 8 }}>
                <TouchableOpacity onPress={() => startEditing(item)} activeOpacity={0.8}
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, borderColor: c.line, borderRadius: radius.md, backgroundColor: c.surface, paddingVertical: 8, paddingHorizontal: 12 }}>
                  <Ionicons name="create-outline" size={16} color={c.accent} />
                  <Text style={{ fontFamily: font.semibold, color: c.accent, fontSize: 12 }}>Edit</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setDeleteTarget(item)} activeOpacity={0.8}
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, borderColor: c.badSoft, borderRadius: radius.md, backgroundColor: c.surface, paddingVertical: 8, paddingHorizontal: 12 }}>
                  <Ionicons name="trash-outline" size={16} color={c.bad} />
                  <Text style={{ fontFamily: font.semibold, color: c.bad, fontSize: 12 }}>Delete</Text>
                </TouchableOpacity>
              </View>
              <AnnouncementPostCard announcement={item} />
            </View>
          ))}
        </View>
      </ScrollView>
      <Modal visible={!!deleteTarget} transparent animationType="fade" onRequestClose={() => setDeleteTarget(null)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(20,15,10,0.48)', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <View style={{ width: '100%', maxWidth: 420, backgroundColor: c.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: c.line, padding: space.lg, gap: 12 }}>
            <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: c.badSoft, alignItems: 'center', justifyContent: 'center' }}>
              <Ionicons name="trash-outline" size={21} color={c.bad} />
            </View>
            <Text style={{ fontFamily: font.display, fontSize: 19, color: c.ink }}>Delete announcement?</Text>
            <Text style={{ fontFamily: font.regular, fontSize: 13, lineHeight: 19, color: c.muted }}>
              “{deleteTarget?.title}” will be removed from helper and employer dashboards. This cannot be undone.
            </Text>
            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 9, marginTop: 4 }}>
              <TouchableOpacity onPress={() => setDeleteTarget(null)} style={{ paddingVertical: 10, paddingHorizontal: 15, borderRadius: radius.md, borderWidth: 1, borderColor: c.line }}>
                <Text style={{ fontFamily: font.semibold, color: c.ink }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => void confirmDelete()} style={{ paddingVertical: 10, paddingHorizontal: 15, borderRadius: radius.md, backgroundColor: c.bad }}>
                <Text style={{ fontFamily: font.semibold, color: '#fff' }}>Delete post</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}
