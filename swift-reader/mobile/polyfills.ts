
import 'react-native-get-random-values';
import { Buffer } from 'buffer';
import { TextEncoder, TextDecoder } from 'text-encoding';
import process from 'process';

// Ensure Buffer is globally available
(global as any).Buffer = Buffer;
(global as any).process = process;
(global as any).TextEncoder = TextEncoder;
(global as any).TextDecoder = TextDecoder;

// Environment shims for browser-dependent libs
if (typeof window === 'undefined') {
    (global as any).window = global;
}
if (typeof document === 'undefined') {
    (global as any).document = {
        createElement: () => ({}),
        getElementsByTagName: () => [],
    };
}
if (typeof navigator === 'undefined') {
    (global as any).navigator = {
        userAgent: 'React Native',
    };
}

// Some libs check for global instead of window
(global as any).global = global;
