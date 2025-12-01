<script setup>
    import { supabase } from '../lib/supabaseClient'
    import { useRouter, useRoute } from 'vue-router'
    import { ref, onMounted, onBeforeUnmount, computed } from 'vue'
    import { getDeviceId } from '../lib/diviceid.js'

    const router = useRouter()
    const route = useRoute()
    const deviceId = getDeviceId()
    const boardId = route.params.roomId

    //User player State
    const player = ref(null)
    const loadingPlayer = ref(false)

    //All players State
    const players = ref([])
    const loadingPlayers = ref(false)
    const onlinePlayerIds = ref([])
    const onlinePlayers = computed(() =>
      players.value.filter(p => onlinePlayerIds.value.includes(p.id))
    )
    const offlinePlayers = computed(() =>
      players.value.filter(p => !onlinePlayerIds.value.includes(p.id))
    )

    //Board State
    const board = ref(null)
    const loadingBoard = ref(false)

    //Squares State
    const squares = ref([])
    const loadingSquares = ref(false)

    //editing state
    const editMode = ref(false)

    //fetch the player associated with this device in this board
    async function fetchPlayer() {
        loadingPlayer.value = true

        const { data: fetchedPlayer, error: fetchPlayerError } = await supabase
            .from('players')
            .select('*')
            .eq('board_id', boardId)
            .eq('device_id', deviceId)
            .single()
        
        loadingPlayer.value = false
        
        if (fetchPlayerError) {
            console.error('Error fetching player:', fetchPlayerError)
            router.push(`/`)
            return
        }

        player.value = fetchedPlayer
        //console.log(player.value)
    }  

    //fetch all players in this board
    async function fetchPlayers() {
        loadingPlayers.value = true

        const { data: fetchedPlayers, error: fetchPlayersError } = await supabase
            .from('players')
            .select('*')
            .eq('board_id', boardId)
        
        loadingPlayers.value = false
        if (fetchPlayersError) {
            console.error('Error fetching players:', fetchPlayersError)
            return
        }
        players.value = fetchedPlayers
        //console.log(players.value)
    }

    //fetch the board data
    async function fetchBoard() {
        loadingBoard.value = true
        const { data: fetchedBoard, error: fetchBoardError } = await supabase
            .from('boards')
            .select('*')
            .eq('id', boardId)
            .single()
        
        loadingBoard.value = false

        if (fetchBoardError) {
            console.error('Error fetching board:', fetchBoardError)
            return
        }

        board.value = fetchedBoard
        //console.log(board.value)
    }

    //fetch the squares data
    async function fetchSquares() {
        loadingSquares.value = true
        const { data: fetchedSquares, error: fetchSquaresError } = await supabase
            .from('squares')
            .select('*')
            .eq('board_id', boardId)
            .order('row', { ascending: true })
            .order('column', { ascending: true })

        loadingSquares.value = false

        if (fetchSquaresError) {
            console.error('Error fetching squares:', fetchSquaresError)
            return
        }

        squares.value = fetchedSquares
        //console.log(squares.value)
    }

    //checking and unchecking a square
    async function toggleCheckSquare(squareId) {
        //check if current player has picked a color yet
        if (!player.value.color) {
            console.error('Pick a color before checking squares.')
            return
        }

        //Fetch current square state
        const { data: square, error: fetchSquareError } = await supabase
            .from('squares')
            .select('checked_by')
            .eq('id', squareId)
            .single()
        
        if (fetchSquareError) {
            console.error('Error fetching square:', fetchSquareError)
            return
        }

        let currentArray = square.checked_by || []

        //Toggle logic
        let updatedArray
        if (currentArray.includes(player.value.id)) {
            //Uncheck
            updatedArray = currentArray.filter(id => id !== player.value.id)
        } else {
            //Check
            updatedArray = [...currentArray, player.value.id]
        }

        //Update square in supabase
        const { error: updatedSquareError } = await supabase
            .from('squares')
            .update({ checked_by: updatedArray})
            .eq('id', squareId)

        if (updatedSquareError) {
            console.error('Error updating square:', updatedSquareError)
            return
        }
    }

    //color related functions

    const availableColors = [
        "Red", 
        "Green", 
        "Blue", 
        "Yellow",
        "Orange",
        "Purple",
        "#7C4700", //brown
        "Pink"
    ]

    function isColorTaken(selectedColor) {
        return players.value.some(p => p.color === selectedColor)
    }

    async function setPlayerColor(selectedColor) {
        if (isColorTaken(selectedColor)) {
            console.error('Color already taken:', selectedColor)
            return
        }

        const { data: updatedColor, error: updateColorError } = await supabase
            .from('players')
            .update({ color: selectedColor })
            .eq('id', player.value.id)
            .select()
            .single()
 
        if (updateColorError) {
            console.error('Error updating player color:', updateColorError)
        }

        player.value.color = updatedColor.color
    }

    function getSquareStyle(square) {
        if (square.checked_by.length === 0) {
            return {}
        }

        //get players who checked that square
        const checkedPlayers = players.value.filter(p => square.checked_by.includes(p.id))
        const colors = checkedPlayers.map(p => p.color)

        //one person checked
        if (checkedPlayers.length === 1){
            return { backgroundColor: colors[0], color: "white"}
        }

        //multple people checked
        const step = 100 / (colors.length)
        const gradientParts = colors.map((color, i) => {
            const start = i * step
            const end = (i+1) * step
            return `${color} ${start}%, ${color} ${end}%`
        })

         const gradient = `linear-gradient(135deg, ${gradientParts.join(", ")})`;

        return { background: gradient, color: "white" }
    }

    //function to update the squares text
    async function editSquareText(square) {
        const newText = prompt("Enter new text for the square:", square.text)
        if (!newText || newText === square.text) {
            return
        }

        const { error: updateTextError } = await supabase
            .from('squares')
            .update({ text: newText})
            .eq('id', square.id)

        if (updateTextError) {
            console.error('Error updating square text:', updateTextError)
            return
        }

        square.text = newText;
    }


    //copy link function
    const copied = ref(false)
    function copyJoinLink() {
        const roomId = boardId
        const joinLink = `${window.location.origin}/join/${roomId}`

        navigator.clipboard.writeText(joinLink).then(() => {
            console.log('Join link copied to clipboard:', joinLink)
            copied.value = true
            setTimeout(() => {
                copied.value = false
            }, 1500)
        })
    }

    let squaresChannel
    let playerChannel
    let onlinePlayersChannel
    onMounted(async () => {
        await fetchPlayer()
        await fetchPlayers()
        await fetchBoard()
        await fetchSquares()

        //subscription to squares
        squaresChannel = supabase
            .channel(`board-changes-${boardId}`)
            .on(
                "postgres_changes",
                { event: "*", schema: "public", table: "squares", filter: `board_id=eq.${boardId}`},
                (payload) => {
                    const updated = payload.new
                    const index = squares.value.findIndex(square => square.id === updated.id)
                    if (index !== -1) {
                        squares.value[index] = updated
                    }
                }
            )
            .subscribe()
        
        //subscription to players
        playerChannel = supabase
            .channel(`players-${boardId}`)
            .on(
                "postgres_changes",
                { event: "*", schema: "public", table: "players", filter: `board_id=eq.${boardId}`},
                (payload) => {
                    const updatedPlayer = payload.new
                    const index = players.value.findIndex(p => p.id === updatedPlayer.id)
                    if (index !== -1) {
                        players.value[index] = updatedPlayer
                    } else {
                        players.value.push(updatedPlayer)
                    }
                }
            )
            .subscribe()
          
        //subscription to online players presence
        onlinePlayersChannel = supabase.channel(`online-players-${boardId}`, {
          config: {
            presence: {
              key: player.value.id
            }
          }
        })

        onlinePlayersChannel.on('presence', {event: 'sync'}, () => {
          const state = onlinePlayersChannel.presenceState()
          onlinePlayerIds.value = Object.keys(state)
          //console.log('Online players:', onlinePlayerIds.value)
        })
        .subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            onlinePlayersChannel.track({
              nickname: player.value.nickname,
              color: player.value.color || null
            })
          }
        })
    })

    onBeforeUnmount(() => {
        if (squaresChannel) {
            supabase.removeChannel(squaresChannel)
        }
        if (playerChannel) {
            supabase.removeChannel(playerChannel)
        }

        onlinePlayersChannel?.untrack()
        onlinePlayersChannel?.unsubscribe()
    })
    
</script>

<template>
  <div class="room">
    <div v-if="loadingPlayer || loadingBoard || loadingSquares || loadingPlayers">
      <h1>Loading...</h1>
    </div>

    <div v-else class="room-wrapper">

      <!-- Title -->
      <h1 class="room-title">{{ board?.title }}</h1>

      <!-- Tool Bar -->
      <div class="toolbar">

        <!-- Color Picker -->
        <div class="color-picker">
          <button
            v-for="color in availableColors"
            :key="color"
            class="color-btn"
            :style="{ background: color, opacity: isColorTaken(color) ? 0.4 : 1 }"
            @click="setPlayerColor(color)"
            :disabled="isColorTaken(color)"
          >
            {{ isColorTaken(color) ? " X " : " " }}
          </button>
        </div>

        <!-- Edit Toggle -->
        <div class="edit-toggle">
          <label class="switch">
            <input type="checkbox" v-model="editMode">
            <span class="slider"></span>
          </label>
          <span class="label">Edit Mode</span>
        </div>

        <!-- Copy Link -->
        <button class="copy-link-btn" @click="copyJoinLink" :class="{ success: copied }">
          {{ copied ? "Copied!" : "Copy Join Link" }}
        </button>
      </div>

      <!-- Board -->
      <div class="board">
        <div class="grid">
          <div
            v-for="square in squares"
            :key="square.id"
            class="square"
            :style="getSquareStyle(square)"
            @click="editMode ? editSquareText(square) : toggleCheckSquare(square.id)"
          >
            {{ square.text }}
          </div>
        </div>

        <!-- Player List -->
        <aside class="player-list">
          <h2 class="player-list-title">Players</h2>
            
            <!-- Online players -->
            <div v-for="p in onlinePlayers" :key="p.id" class="player-item" :style="{ backgroundColor: p.color || '#ddd' }">
              <span class="player-name">{{ p.nickname }}</span>
              <span v-if="p.id === player.id"> (You) </span>
            </div>

            <!-- Offline players -->
            <div v-if="offlinePlayers.length > 0" class="offline-header">Offline</div>
            <div v-for="p in offlinePlayers" :key="p.id" class="player-item offline" :style="{ backgroundColor: p.color || '#ddd' }">
              <span class="player-name">{{ p.nickname }}</span>
              <span v-if="p.id === player.id"> (You) </span>
            </div>
        </aside>
      </div>

    </div>
  </div>
</template>

<style scoped>
.room-title {
  text-align: center;
  font-size: 2.2rem;
  font-weight: 700;
  margin: 10px auto 20px;
  letter-spacing: 1px;
  text-transform: uppercase;
}

/* --- Toolbar at top (color picker + edit toggle + copy link) --- */
.toolbar {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 25px;
  padding: 10px 20px;
  border-bottom: 2px solid #eee;
  margin-bottom: 20px;
}

/* --- Color Picker --- */
.color-picker {
  display: flex;
  gap: 8px;
}

.color-btn {
  width: 35px;
  height: 35px;
  border-radius: 6px;
  border: none;
  cursor: pointer;
  font-size: 0.7rem;
  color: white;
  font-weight: bold;
}

/* --- Edit Toggle --- */
.edit-toggle {
  display: flex;
  align-items: center;
  gap: 10px;
}

.switch {
  position: relative;
  display: inline-block;
  width: 46px;
  height: 24px;
}

.switch input {
  opacity: 0;
  width: 0;
  height: 0;
}

.slider {
  position: absolute;
  cursor: pointer;
  top: 0; left: 0; right: 0; bottom: 0;
  background-color: #ccc;
  transition: 0.3s;
  border-radius: 24px;
}

.slider:before {
  position: absolute;
  content: "";
  height: 18px;
  width: 18px;
  left: 3px;
  bottom: 3px;
  background-color: white;
  transition: 0.3s;
  border-radius: 50%;
}

input:checked + .slider {
  background-color: #4CAF50;
}

input:checked + .slider:before {
  transform: translateX(22px);
}

/* --- Copy Join Link Button --- */
.copy-link-btn {
  background: #0066ff;
  border: none;
  padding: 8px 14px;
  border-radius: 6px;
  color: white;
  font-weight: 600;
  cursor: pointer;
  transition: 0.2s;
}

.copy-link-btn:hover {
  background: #0053d6;
}

.copy-link-btn.success {
  background: #28a745 !important; 
  transform: scale(1.08);            
}

/* --- Board --- */
.board {
  display: flex;
  justify-content: center;
  margin-top: 20px;
  padding: 20px;
}

.grid {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 6px;
  width: min(750px, 90vw);
}

.square {
  background: white;
  border: 1px solid #ddd;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  text-align: center;
  aspect-ratio: 1/1;
  padding: 8px;
  cursor: pointer;
  user-select: none;
  font-size: 0.9rem;
  word-wrap: break-word;
}

/* --- Player List --- */
.player-list {
  width: 200px;
  border-left: 2px solid #ddd;
  padding: 20px 10px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  background: #fafafa;
  margin-left: 20px;
}

.player-list-title {
  font-size: 1.2rem;
  font-weight: bold;
  margin-bottom: 10px;
}

.player-item {
  padding: 8px 10px;
  color: white;
  font-weight: 600;
  border-radius: 8px;
}

.online-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  margin-left: auto;
  background: gray;
}

.online-dot.online {
  background: #4caf50;
}

.offline-header {
  font-size: 1rem;
  font-weight: bold;
  margin-top: 12px;
  margin-bottom: 6px;
  color: #666;
}

.player-item.offline {
  opacity: 0.5;
}
</style>