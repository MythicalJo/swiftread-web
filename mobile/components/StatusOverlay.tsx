
import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, AppState } from 'react-native';
import * as Battery from 'expo-battery';
import { Battery as BatteryIcon, BatteryCharging, BatteryLow, BatteryMedium, BatteryFull } from 'lucide-react-native';

interface StatusOverlayProps {
    theme: any;
    showClock?: boolean;
    showBattery?: boolean;
    use24HourClock?: boolean;
}

export const StatusOverlay: React.FC<StatusOverlayProps> = ({
    theme,
    showClock = true,
    showBattery = true,
    use24HourClock = false
}) => {
    const [time, setTime] = useState(new Date());
    const [batteryLevel, setBatteryLevel] = useState<number | null>(null);
    const [isCharging, setIsCharging] = useState(false);
    const appState = useRef(AppState.currentState);

    useEffect(() => {
        const timer = setInterval(() => setTime(new Date()), 1000);

        const getBattery = async () => {
            try {
                const level = await Battery.getBatteryStateAsync();
                const val = await Battery.getBatteryLevelAsync();
                setBatteryLevel(val);
                setIsCharging(level === Battery.BatteryState.CHARGING);
            } catch (e) {
                console.warn('Battery API error:', e);
            }
        };
        getBattery();

        const batterySub = Battery.addBatteryLevelListener(({ batteryLevel }) => {
            setBatteryLevel(batteryLevel);
        });
        const stateSub = Battery.addBatteryStateListener(({ batteryState }) => {
            setIsCharging(batteryState === Battery.BatteryState.CHARGING);
        });

        // Periodic refresh as a fallback
        const batteryRefresh = setInterval(getBattery, 30000);

        const appStateSub = AppState.addEventListener('change', nextAppState => {
            if (appState.current.match(/inactive|background/) && nextAppState === 'active') {
                getBattery();
            }
            appState.current = nextAppState;
        });

        return () => {
            clearInterval(timer);
            clearInterval(batteryRefresh);
            batterySub.remove();
            stateSub.remove();
            appStateSub.remove();
        };
    }, []);

    const formatTime = (date: Date) => {
        let hours = date.getHours();
        const mins = date.getMinutes();
        const ampm = hours >= 12 ? 'PM' : 'AM';

        if (!use24HourClock) {
            hours = hours % 12;
            hours = hours ? hours : 12; // the hour '0' should be '12'
        }

        const minsStr = mins < 10 ? '0' + mins : mins;
        return use24HourClock ? `${hours}:${minsStr}` : `${hours}:${minsStr} ${ampm}`;
    };

    const renderBatteryIcon = () => {
        const color = theme.text;
        const size = 14;
        if (isCharging) return <BatteryCharging size={size} color={color} />;
        if (batteryLevel === null) return <BatteryIcon size={size} color={color} />;
        if (batteryLevel < 0.2) return <BatteryLow size={size} color={color} />;
        if (batteryLevel < 0.6) return <BatteryMedium size={size} color={color} />;
        return <BatteryFull size={size} color={color} />;
    };

    return (
        <View style={styles.container}>
            {showBattery && (
                <View style={styles.item}>
                    <Text style={[styles.text, { color: theme.text, opacity: 0.6 }]}>
                        {batteryLevel !== null ? `${Math.round(batteryLevel * 100)}% ` : ''}
                    </Text>
                    {renderBatteryIcon()}
                </View>
            )}
            {showClock && (
                <View style={[styles.item, { marginLeft: 12 }]}>
                    <Text style={[styles.text, { color: theme.text, opacity: 0.6 }]}>
                        {formatTime(time)}
                    </Text>
                </View>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        top: 10,
        right: 20,
        flexDirection: 'row',
        alignItems: 'center',
        zIndex: 1000,
    },
    item: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    text: {
        fontSize: 12,
        fontWeight: '700',
        fontVariant: ['tabular-nums'],
    }
});
