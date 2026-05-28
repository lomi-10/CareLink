import React from 'react';
import { View, Text, TouchableOpacity, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { styles } from '.';

export function PhotoSection({ pickImage, profileImage }: any) {
  return (
    <View style={styles.photoSection}>
      <TouchableOpacity onPress={pickImage} style={styles.photoWrapper}>
        <View style={styles.photoBorder}>
          {profileImage ? (
            <Image source={{ uri: profileImage }} style={styles.photo} />
          ) : (
            <View style={styles.photoPlaceholder}>
              <Ionicons name="person" size={50} color="#ADB5BD" />
            </View>
          )}
        </View>
        <View style={styles.cameraIconContainer}>
          <Ionicons name="camera" size={18} color="#fff" />
        </View>
      </TouchableOpacity>
      <Text style={styles.photoText}>Change Profile Photo</Text>
    </View>
  );
}