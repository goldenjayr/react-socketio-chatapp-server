const users = []

const addUser = ({id, name, room}) => {
    name = name.trim().toLowerCase()
    room = room.trim().toLowerCase()

    const existingUser = users.find(user => user.room === room && user.name === name)

    if (existingUser) {
        return { error: 'Username already exists'}
    }

    const user = { id, name, room}
    users.push(user)
    console.log(users)

    return { user }
}

const removeUser = id => {
    const user = users.find(user => user.id === id)
    const remainingUsers = users.filter(user => user.id !== id)
    console.log("TCL: remainingUsers", remainingUsers)
    console.log(users)
    users = [...remainingUsers]
    console.log("TCL: users", users)

    return user
}

const getUser = id => users.find(user => user.id === id)

const getUsersInRoom = room => users.filter(user => user.room === room)

module.exports = {
    addUser,
    removeUser,
    getUser,
    getUsersInRoom
}