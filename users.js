let users = []
let chatHistory = []

const addUser = ({id, name, room}) => {
    name = name.trim().toLowerCase()
    room = room.trim().toLowerCase()

    const existingUser = users.find(user => user.room === room && user.name === name)

    // if (existingUser) {
    //     return { error: 'Username already exists'}
    // }

   // delete user if it exists
    if (existingUser) {
        console.log("TCL: addUser -> existingUser user already exists", existingUser)
        removeUser(existingUser.id)
    }

    const user = { id, name, room}
    users.push(user)
    console.log(`Successfully added ${name} to users --> current list is.`, users)

    return { user }
}

const removeUser = id => {
    const user = users.find(user => user.id === id)
    const remainingUsers = users.filter(user => user.id !== id)
    users = [...remainingUsers]
    console.log("TCL: removeUser users", users)

    return user
}

const getUser = id => users.find(user => user.id === id)

const getUsersInRoom = room => users.filter(user => user.room === room)

const addToChatHistory = ({message, user}) => {
    chatHistory.push({user, message})
    console.log(chatHistory)
}

const getChatHistory = () => {
    return chatHistory
}

module.exports = {
    addUser,
    removeUser,
    getUser,
    getUsersInRoom,
    addToChatHistory,
    getChatHistory
}