require('dotenv').config();
const TelegramBot = require('./telegram');
const prisma = require('../prisma/db');

const TOKEN = process.env.TELEGRAM_TOKEN;

const getTodoBody = (todo) => {
    const status = todo.done ? '✅️' : '❌';
    return `id: ${todo.id} - ${todo.title}\nis done: ${status} \n `;
}

const getTodosMessage = (todos) => {
    if(!todos.length) {
        return 'You dont have any todos, create one with /addtodo command';
    }
    return 'Your todos: \n\n' + todos.map(todo => getTodoBody(todo)).join('\n');
}

// No need to pass any parameters as we will handle the updates with Express
const bot = new TelegramBot(TOKEN, {
    polling: {
        interval: 300,
        autoStart: true
    }
});

bot.on('message', async msg => {
    const {chat} = msg;

    if (msg.text === '/register' || msg.text === '/start') {
        try {
            await prisma.user.create({
                data: {first_name: chat.first_name, username: chat.username, chatId: chat.id},
            });
        } catch (err) {
            console.error(err);
        }
        bot.sendMessage(msg.chat.id, 'successfully registered');
        return;
    }

    const user = await prisma.user.findUnique({where: {username: chat.username, chatId: chat.id}});

    if (!user) {
        bot.sendMessage(msg.chat.id, 'call /register command to register');
        return;
    }

    if (msg.text === '/unregister') {
        try {
            await prisma.user.delete({
                where: {username: chat.username, chatId: chat.id},
            });
            bot.sendMessage(msg.chat.id, 'all data has been deleted');
        } catch (err) {
            console.error(err);
        }
        return;
    }

    if (msg.text === '/getusers') {
        const users = await prisma.user.findMany()
        bot.sendMessage(msg.chat.id, users.map(user => user.username).join(','));
        return;
    }

    if (msg.text.includes('/addtodo')) {
        const [cmd, title] = msg.text.split('/addtodo ');
        if (!title) {
            bot.sendMessage(msg.chat.id, `add title after command`);
            return;
        }
        const newTodo = await prisma.todo.create({
            data: {
                title,
                description: '',
                done: false,
                username: chat.username,
            }
        })
        bot.sendMessage(msg.chat.id, `todo is created. id: ${newTodo.id}`);
        return;
    }

    if (msg.text.includes('/deletetodo')) {
        const [cmd, id] = msg.text.split(' ');
        if (!id) {
            bot.sendMessage(msg.chat.id, 'add id after command');
            return;
        }
        try {
            await prisma.todo.delete({
                where: {
                    id: Number(id),
                }
            })
            bot.sendMessage(msg.chat.id, 'todo is deleted');
            return;
        } catch (e) {
            bot.sendMessage(msg.chat.id, 'todo is not deleted');
            return;
        }
    }

    if (msg.text.includes('/tododone')) {
        const [cmd, id] = msg.text.split(' ');
        if (!id) {
            bot.sendMessage(msg.chat.id, 'add id after command');
            return;
        }
        try {
            await prisma.todo.update({
                where: {
                    id: Number(id),
                },
                data: {done: true}
            })
            bot.sendMessage(msg.chat.id, 'todo is done ✅️');
            return;
        } catch (e) {
            console.log(e);
            bot.sendMessage(msg.chat.id, 'todo is not done');
            return;
        }
    }

    if (msg.text === '/gettodos') {
        const todos = await prisma.todo.findMany({
            where: {
                username: chat.username, NOT: {
                    done: true
                }
            },
        })
        bot.sendMessage(msg.chat.id, getTodosMessage(todos));
        return;
    }

    if (msg.text === '/gettodosall') {
        const todos = await prisma.todo.findMany({
            where: {username: chat.username},
        })
        bot.sendMessage(msg.chat.id, getTodosMessage(todos));
        return;
    }

    await bot.sendMessage(msg.chat.id, 'unknown command');
})

module.exports = bot;


