const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const ListItemSchema = new Schema({
    done: {type: Boolean, default: false},
    text: {type: String, default: ''}
});

const TodoListSchema = new Schema({
    name: {type: String, required: true},
    owner: {type: String, required: true},
    items: [ListItemSchema]
}, { timestamps: { createdAt: 'createdAt' }});

TodoListSchema.statics.findTodoListByOwnerId = async function(userId) {
    try {
        return await this.find({owner: userId}, {_id: 1, name: 1, items: 1});
    } catch (error) {
        return null;
    }
};

TodoListSchema.statics.createTodoList = async function(userId, listId, name) {
    try {
        return await this.create({_id: listId, owner: userId, name});
    } catch (error) {
        return null;
    }
}

TodoListSchema.statics.deleteTodoList = async function(listId, userId) {
    try {
        const list = await this.findById(listId);
        // prevent unauthorized delete
        if (list.owner !== userId) { return null; }
        return await this.findByIdAndDelete(listId);
    } catch (error) {
        return null;
    }
}

TodoListSchema.statics.changeTodoListName = async function(listId, name, userId) {
    try {
        const list = await this.findById(listId);
        // prevent unauthorized delete
        if (list.owner !== userId) { return null; }
        list.name = name;
        console.log(list);
        return await list.save();
    } catch (error) {
        return null;
    }
}

TodoListSchema.statics.newListItem = async function(listId, itemId, text, userId) {
    const list = await this.findById(listId);
    // allow only authorized change
    if (list.owner !== userId) { return null; }
    // create the new list item
    const newListItem = list.items.create({_id: itemId, text: text});
    list.items.push(newListItem);
    // save to db
    try {
        await list.save();
        return newListItem;
    } catch (error) {
        return null;
    }
}

TodoListSchema.statics.deleteListItem = async function(listId, itemId, userId) {
    const list = await this.findById(listId);
    // prevent unauthorized delete
    if (list.owner !== userId) { return null; }
    // delete if authorize
    list.items.id(itemId).remove();
    try {
        return await list.save();
    } catch (error) {
        return null;
    }
}

TodoListSchema.statics.changeListItemChecked = async function(listId, itemId, checked, userId) {
    const list = await this.findById(listId);
    // prevent unauthorized change
    if (list.owner !== userId) { return null; }
    // change if authorized
    const listItem = list.items.id(itemId);
    if (listItem) { listItem.done = checked }
    try {
        return await list.save();
    } catch (error) {
        return null;
    }
}

TodoListSchema.statics.changeListItemText = async function(listId, itemId, test, userId) {
    const list = await this.findById(listId);
    // prevent unauthorized change
    if (list.owner !== userId) { return null; }
    // change if authorized
    const listItem = list.items.id(itemId);
    if (listItem) { listItem.text = test }
    try {
        return await list.save();
    } catch (error) {
        return null;
    }
}

const TodoList = mongoose.model('TodoList', TodoListSchema);

module.exports = TodoList;