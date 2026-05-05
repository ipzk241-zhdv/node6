import mongoose from 'mongoose';

export const connectDB = async (): Promise<void> => {
    try {
        const mongoURI = process.env.MONGODB_URI;
        
        if (!mongoURI) {
            throw new Error('Змінна середовища MONGODB_URI не визначена');
        }

        await mongoose.connect(mongoURI);
        console.log('Успішно підключено до MongoDB');

        mongoose.connection.on('error', (err) => {
            console.error('Помилка з\'єднання з MongoDB:', err);
        });

        mongoose.connection.on('disconnected', () => {
            console.warn('Відключено від MongoDB');
        });

    } catch (error) {
        console.error('Не вдалося підключитися до MongoDB:', error);
        process.exit(1);
    }
};