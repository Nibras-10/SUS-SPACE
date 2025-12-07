# Sus-Space 🚀

**A high-fidelity, multiplayer social deduction game built with React, Phaser 3, and TypeScript.**

Sus-Space is a fully functional web-based clone of *Among Us*, featuring authoritative server simulation, dynamic lighting, procedural asset generation, and complex gameplay mechanics. It demonstrates how to bridge React UI with a Phaser 3 rendering engine in a seamless application.

![Game Preview](https://via.placeholder.com/1200x600.png?text=Sus-Space+Gameplay+Preview)

## ✨ Key Features

### 🎮 Gameplay Mechanics
*   **Roles:** Fully implemented **Impostor** vs. **Crewmate** logic.
*   **The Map:** A complete recreation of "The Skeld" layout with accurate rooms, corridors, and collision geometry.
*   **Networking Simulation:** An authoritative `MockServer` architecture designed to simulate Socket.io events (state validation, tick rates, and interpolation).
*   **Meeting & Voting:** Emergency meetings, dead body reporting, and a full voting UI system.

### 👁️ Visuals & Immersion
*   **Dynamic Raycasting Vision:** "Fog of War" system using raycasting algorithms to cast realistic shadows and hide entities behind walls when lights are sabotaged.
*   **Procedural Textures:** All game assets (floors, walls, characters, vents) are generated programmatically via HTML5 Canvas—no external image assets required.
*   **Glassmorphism UI:** Modern, responsive HUD and Menus built with Tailwind CSS and React.
*   **3D Starfield:** Custom Canvas-based 3D warp-speed animation on the landing page.

### 🔧 Systems
*   **Interactive Tasks:** 8+ unique minigames including:
    *   *Fix Wiring* (Drag & Drop)
    *   *Prime Shields* (Pattern click)
    *   *Unlock Manifolds* (Sequence memory)
    *   *Fuel Engines* (Hold interaction)
    *   *Swipe Card* (Timing mechanic)
*   **Sabotage System:** Impostors can trigger:
    *   **Reactor Meltdown:** Critical countdown requiring player intervention.
    *   **Lights Malfunction:** Reduces crewmate vision radius globally.
    *   **Door Locks:** Traps players in specific rooms.
*   **Vent System:** Networked vent travel for Impostors using a node-based graph.
*   **Procedural Audio:** A `SoundManager` using the **Web Audio API** to generate SFX (steps, alarms, kills) in real-time without audio files.

## 🛠️ Tech Stack

*   **Frontend Framework:** [React 18](https://reactjs.org/) (TypeScript)
*   **Game Engine:** [Phaser 3](https://phaser.io/)
*   **Styling:** [Tailwind CSS](https://tailwindcss.com/)
*   **Icons:** [Lucide React](https://lucide.dev/)
*   **State Management:** React Hooks + Event Emitters
*   **Audio:** Native Web Audio API

## 🕹️ Controls

| Key | Action |
| :--- | :--- |
| **W, A, S, D** | Move Character |
| **Arrow Keys** | Move Character |
| **E** | Use / Action / Kill |
| **V** | Vent (Impostor Only) |
| **Mouse** | Interact with UI & Minigames |

## 📦 Installation & Setup

1.  **Clone the repository**
    ```bash
    git clone https://github.com/yourusername/sus-space.git
    cd sus-space
    ```

2.  **Install dependencies**
    ```bash
    npm install
    ```

3.  **Run the development server**
    ```bash
    npm run dev
    ```

4.  Open `http://localhost:3000` to play!

## 📂 Project Structure

*   `src/components/game/scenes/MainScene.ts`: The core Phaser game loop, rendering, input handling, and raycasting logic.
*   `src/components/UI/HUD.tsx`: The React-based Heads Up Display, handling the React side of the game state (Minigames, Voting, Meetings).
*   `src/services/MockServer.ts`: A local simulation of a Node.js authoritative server. It handles physics, collisions, game state machines, and AI bots.
*   `src/game/mapData.ts`: The "Source of Truth" for the map geometry, defining walls, zones, vents, and task locations.

## 🧠 Architecture Note

Currently, the networking is handled by a local `MockServer` class (`services/MockServer.ts`) to allow for instant playability and testing without a backend deploy. However, the event-based architecture (`emit`/`on`) is strictly designed to be swapped with `socket.io-client` for real multiplayer deployment with zero logic changes.

---

*Built with ❤️ and TypeScript.*