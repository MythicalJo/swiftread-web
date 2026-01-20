
import React from 'react';
import {
    Modal,
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    TouchableWithoutFeedback,
    Dimensions,
    ScrollView,
    KeyboardAvoidingView,
    Platform
} from 'react-native';
import { X } from 'lucide-react-native';

interface AppModalProps {
    visible: boolean;
    onClose: () => void;
    title: string;
    children: React.ReactNode;
    theme: any;
    footer?: React.ReactNode;
}

export const AppModal: React.FC<AppModalProps> = ({
    visible,
    onClose,
    title,
    children,
    theme,
    footer
}) => {
    return (
        <Modal
            visible={visible}
            transparent={true}
            animationType="fade"
            onRequestClose={onClose}
        >
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={{ flex: 1 }}
            >
                <TouchableWithoutFeedback onPress={onClose}>
                    <View style={styles.overlay}>
                        <TouchableWithoutFeedback>
                            <View style={[styles.content, { backgroundColor: theme.cardBg }]}>
                                <View style={styles.header}>
                                    <Text style={[styles.title, { color: theme.text }]}>{title}</Text>
                                    <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                                        <X size={24} color={theme.subText} />
                                    </TouchableOpacity>
                                </View>

                                <ScrollView style={styles.body} showsVerticalScrollIndicator={false}>
                                    {children}
                                </ScrollView>

                                {footer && (
                                    <View style={[styles.footer, { borderTopColor: theme.border }]}>
                                        {footer}
                                    </View>
                                )}
                            </View>
                        </TouchableWithoutFeedback>
                    </View>
                </TouchableWithoutFeedback>
            </KeyboardAvoidingView>
        </Modal>
    );
};

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        padding: 20,
    },
    content: {
        borderRadius: 30,
        maxHeight: Dimensions.get('window').height * 0.8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.3,
        shadowRadius: 20,
        elevation: 10,
        overflow: 'hidden',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 24,
        paddingBottom: 16,
    },
    title: {
        fontSize: 22,
        fontWeight: '800',
        flex: 1,
    },
    closeBtn: {
        marginLeft: 15,
    },
    body: {
        paddingHorizontal: 24,
        paddingBottom: 24,
    },
    footer: {
        padding: 20,
        borderTopWidth: 1,
        flexDirection: 'row',
        gap: 12,
    }
});
