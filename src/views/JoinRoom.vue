<script setup>
    import { supabase } from '../lib/supabaseClient'
    import { useRouter, useRoute } from 'vue-router'
    import { ref, onMounted } from 'vue'
    import { getDeviceId } from '../lib/diviceid.js'

    const router = useRouter()
    const route = useRoute()
    const deviceId = getDeviceId()
    const boardId = route.params.roomId
    
    //Join Room State
    const room = ref(null)
    const joinRoomNickname = ref('')
    const joinRoomPass = ref('')
    const loadingBoard = ref(false)
    const loadingJoin = ref(false)

    //get board info
    async function fetchBoard() {

        loadingBoard.value = true
        const { data: board, error: fetchBoardError } = await supabase
            .from('boards')
            .select('*')
            .eq('id', boardId)
            .single()
        
        loadingBoard.value = false
        if (fetchBoardError) {
            console.error('Error fetching board:', fetchBoardError);
            router.push(`/`)
            return
        }
        room.value = board
        //console.log(room.value)
    }

    //join room logic
    async function joinRoom() {
        if (!boardId || !joinRoomPass.value || !joinRoomNickname.value) {
            console.error('Please Enter a Nickname and the room Password')
            return;
        }

        //join board 
        loadingJoin.value = true

        const { data: board, error } = await supabase
            .from('boards')
            .select('id, password')
            .eq('id', boardId)
            .single()

        
        
        if(error || !board) {
            console.error('Error joining room:', error);
            loadingJoin.value = false
            return
        }

        if(board.password !== joinRoomPass.value) {
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

    onMounted(async () => {
        await fetchBoard()
    })

</script>

<template>
    <div>
        <div v-if ="loadingBoard">
            <h1>Loading...</h1>
        </div>
        <div v-else class="join">
            <h1>Join Room: {{ room?.title }}</h1>
                <div class = "form-section">
                    <input
                        v-model="joinRoomNickname"
                        type="text"
                        placeholder="Nickname"
                        class="input"
                    />
                    <input
                        v-model="joinRoomPass"
                        type="password"
                        placeholder="Room Password"
                        class="input"
                    />

                    <button @click="joinRoom" :disabled="loadingJoin">
                        {{ loadingJoin ? 'Joining...' : 'Join Room' }}
                    </button>
            </div>
        </div>
    </div>
</template>

<style scoped>
.join {
    max-width: 500px;
    margin: auto;
    padding: 24px;
    text-align: center;
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