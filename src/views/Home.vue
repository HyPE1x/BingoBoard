<script setup>
    import { supabase } from '../lib/supabaseClient'
    import { useRouter } from 'vue-router'
    import { ref } from 'vue'
    import { getDeviceId } from '../lib/diviceid.js'

    const router = useRouter()
    const deviceId = getDeviceId()

    //Create Board State
    const newBoardName = ref('')
    const newBoardPass = ref('')
    const newBoardNickname = ref('')
    const loadingCreate = ref(false)

    //Join Room State
    const joinBoardId = ref('')
    const joinBoardPass = ref('')
    const joinRoomNickname = ref('')
    const loadingJoin = ref(false)

    //create room logic
    async function createRoom() {
        if (!newBoardName.value || !newBoardPass.value || !newBoardNickname.value) {
            console.error('Please Enter a Board Name, Password, and Nickname');
            return
        }

        
        loadingCreate.value = true

        //insert new board into supabase
        const{ data: newBoard, error } = await supabase
            .from('boards')
            .insert({
                title: newBoardName.value,
                password: newBoardPass.value
            })
            .select()
            .single()
        
        
        if (error) {
            console.error('Error creating room:', error);
            loadingCreate.value = false
            return
        }

        //create squares for the new board
        const squares = []

        for(let row = 0; row < 5; row++) {
            for(let col = 0; col < 5; col++) {
                squares.push({
                    board_id: newBoard.id,
                    row: row,
                    column: col,
                    text: "Enter Text"
                })
            }
        }

        const { error: errorInsertSquares } = await supabase
            .from('squares')
            .insert(squares)
        
        if (errorInsertSquares) {
            console.error('Error creating squares:', errorInsertSquares)
            loadingCreate.value = false
            return
        }

        //insert new player into supabase
        const{ data: newPlayer, error: errorInsertPlayer } = await supabase
            .from('players')
            .insert({
                nickname: newBoardNickname.value,
                board_id: newBoard.id,
                device_id: deviceId
            })
            .select()
            .single()
        
        if (errorInsertPlayer) {
            console.error('Error creating player:', errorInsertPlayer);
            loadingCreate.value = false
            return
        }

        loadingCreate.value = false
        router.push(`/room/${newBoard.id}`)
    }

    //join room logic
    async function joinRoom() {
        if (!joinBoardId.value || !joinBoardPass.value || !joinRoomNickname.value) {
            console.error('Please Enter the Board ID, Password, and Nickname')
            return;
        }

        //join board 
        loadingJoin.value = true

        const { data: board, error } = await supabase
            .from('boards')
            .select('id, password')
            .eq('id', joinBoardId.value)
            .single()

        
        
        if(error || !board) {
            console.error('Error joining room:', error);
            loadingJoin.value = false
            return
        }

        if(board.password !== joinBoardPass.value) {
            console.error('Incorrect Password');
            loadingJoin.value = false
            return
        }

        //check if player with that device id already exists
        const { data: existingDevicePlayer, error: errorFetchDevicePlayer } = await supabase
            .from('players')
            .select('*')
            .eq('device_id', deviceId)
            .eq('board_id', board.id)
            .single()

        if (existingDevicePlayer && existingDevicePlayer.nickname !== joinRoomNickname.value) {
            console.error('You have already joined this room under another nickname')
            loadingJoin.value = false
            return
        }

        //check if player with that nickname already exists
        const { data: existingPlayer, error: errorFetchPlayer } = await supabase
            .from('players')
            .select('id')
            .eq('nickname', joinRoomNickname.value)
            .eq('board_id', board.id)
            .single()

        if (!existingPlayer) {
            //insert new player into supabase
            const{ data: newPlayer, error: errorInsertPlayer } = await supabase
            .from('players')
            .insert({
                nickname: joinRoomNickname.value,
                board_id: board.id,
                device_id: deviceId
            })
            .select()
            .single()

            if (errorInsertPlayer) {
                console.error('Error creating player:', errorInsertPlayer);
                loadingJoin.value = false
                return
            }
        }

        loadingJoin.value = false
        router.push(`/room/${board.id}`)
    }

</script>

<template>
    <div class = "home">
        <h1>Create or Join a Bingo Room</h1>
        <h2>Create a Room</h2>
        <div class = "form-section">
            <input
                v-model="newBoardName"
                type="text"
                placeholder="Room Name"
                class="input"
            />
            <input
                v-model="newBoardPass"
                type="password"
                placeholder="Password"
                class="input"
            />
            <input
                v-model="newBoardNickname"
                type="text"
                placeholder="Nickname"
                class="input"
            />

            <button @click="createRoom" :disabled="loadingCreate">
                {{ loadingCreate ? 'Creating...' : 'Create Board' }}
            </button>
        </div>

        <h2>Join a Room</h2>
        <div class = "form-section">
            <input
                v-model="joinRoomNickname"
                type="text"
                placeholder="Nickname"
                class="input"
            />
            <input
                v-model="joinBoardId"
                type="text"
                placeholder="Room ID"
                class="input"
            />
            <input
                v-model="joinBoardPass"
                type="password"
                placeholder="Room Password"
                class="input"
            />

            <button @click="joinRoom" :disabled="loadingJoin">
                {{ loadingJoin ? 'Joining...' : 'Join Room' }}
            </button>
        </div>
    </div>
</template>

<style scoped>
    .home {
    max-width: 500px;
    margin: auto;
    padding: 24px;
    }

    .form-section {
    margin-bottom: 30px;
    }

    .input {
    display: block;
    width: 100%;
    padding: 10px;
    margin: 8px 0;
    border-radius: 6px;
    border: 1px solid #ccc;
    }

    button {
    width: 104%;
    padding: 12px;
    border: none;
    background: #3a86ff;
    color: white;
    border-radius: 6px;
    cursor: pointer;
    font-size: 16px;
    }

    button:disabled {
    opacity: 0.7;
    cursor: not-allowed;
    }

    .error {
    color: red;
    margin-top: 8px;
    }
</style>