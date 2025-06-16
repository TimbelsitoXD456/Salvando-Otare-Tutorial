window.onload = () => {
    const canvas = document.getElementById("gameCanvas");
    const ctx = canvas.getContext("2d");

    canvas.width = 960;
    canvas.height = 540;

    // Estados del tutorial
    const PASOS = [
        "intro",
        "mover",
        "saltar",
        "doble_salto",
        "atacar",
        "disparar",
        "esquivar",
        "final"
    ];
    let pasoActual = 0;
    let pasoCumplido = false;

    // Botón "Siguiente"
    const botonSiguiente = {
        x: canvas.width - 220,
        y: canvas.height - 80,
        width: 180,
        height: 50,
        hover: false
    };

    // Elementos básicos
    let jugadores = [];
    let plataformas = [
        { x: 300, y: 400, width: 150, height: 20, color: "#A0522D" },
        { x: 600, y: 320, width: 120, height: 20, color: "#228B22" }
    ];
    const suelo = {
        x: 0,
        y: canvas.height - 60,
        width: 960,
        height: 60,
        color: "#228B22"
    };
    let enemigos = [];
    let balas = [];
    let balasEnemigas = [];
    let particulas = [];
    let teclas = {};
    let gravedad = 0.6;
    let atacandoTim = false;
    let disparandoJhoabxi = false;
    let direccionTim = 1;
    let direccionJhoabxi = 1;

    // --- Para el paso de esquivar balas
    let esquivarInicio = null;
    let esquivadasCorrectas = 0;
    let lastHitTime = 0;
    const TIEMPO_PARPADEO = 300;

    // Jugadores base
    function crearJugador(nombre) {
        if (nombre === "Jhoabxi") {
            return {
                nombre: "Jhoabxi",
                x: 250,
                y: 100,
                width: 40,
                height: 40,
                color: "#003366",
                velX: 0,
                velY: 0,
                velocidad: 4,
                salto: -12,
                enElSuelo: false,
                izquierda: "KeyA",
                derecha: "KeyD",
                saltar: "KeyW",
                disparar: "KeyG",
                saltosDisponibles: 2,
                puedeSaltar: true,
                vida: 100,
                vidaMax: 100,
                balaCooldown: 0
            };
        } else {
            return {
                nombre: "Timbelsito",
                x: 150,
                y: 100,
                width: 40,
                height: 40,
                color: "#FFFF99",
                velX: 0,
                velY: 0,
                velocidad: 4,
                salto: -12,
                enElSuelo: false,
                izquierda: "ArrowLeft",
                derecha: "ArrowRight",
                saltar: "ArrowUp",
                saltosDisponibles: 2,
                puedeSaltar: true,
                vida: 100,
                vidaMax: 100
            };
        }
    }
    function reiniciarJugadores() {
        jugadores = [crearJugador("Timbelsito"), crearJugador("Jhoabxi")];
    }
    function resetPaso() {
        reiniciarJugadores();
        enemigos = [];
        balas = [];
        balasEnemigas = [];
        particulas = [];
        esquivarInicio = null;
        esquivadasCorrectas = 0;
        lastHitTime = 0;
        if (PASOS[pasoActual] === "atacar") {
            enemigos.push({
                tipo: "normal",
                x: 400,
                y: suelo.y - 40,
                width: 40,
                height: 40,
                color: "#8B0000",
                vida: 30,
                velX: 0,
                velY: 0
            });
        }
        if (PASOS[pasoActual] === "disparar") {
            enemigos.push({
                tipo: "normal",
                x: 650,
                y: suelo.y - 40,
                width: 40,
                height: 40,
                color: "#8B0000",
                vida: 30,
                velX: 0,
                velY: 0
            });
        }
        if (PASOS[pasoActual] === "esquivar") {
            enemigos.push({
                tipo: "fuerte",
                x: 800,
                y: suelo.y - 54,
                width: 54,
                height: 54,
                color: "#4444FF",
                vida: 999,
                velX: 0,
                velY: 0
            });
        }
    }
    reiniciarJugadores();

    // Utilidad
    function colisiona(rect1, rect2) {
        return (
            rect1.x < rect2.x + rect2.width &&
            rect1.x + rect1.width > rect2.x &&
            rect1.y < rect2.y + rect2.height &&
            rect1.y + rect1.height > rect2.y
        );
    }

    // Círculo vs Rectángulo para balas enemigas
    function circleRectCollision(cx, cy, radius, rx, ry, rw, rh) {
        // Encuentra el punto más cercano al círculo dentro del rectángulo
        let closestX = Math.max(rx, Math.min(cx, rx + rw));
        let closestY = Math.max(ry, Math.min(cy, ry + rh));
        // Calcula la distancia entre el círculo y este punto
        let dx = cx - closestX;
        let dy = cy - closestY;
        return (dx * dx + dy * dy) < (radius * radius);
    }

    // ====== EVENTOS ======
    document.addEventListener("keydown", e => {
        teclas[e.code] = true;
        // Paso "mover": detecta si se movió alguno
        if (PASOS[pasoActual] === "mover") {
            if (teclas["ArrowLeft"] || teclas["ArrowRight"] || teclas["KeyA"] || teclas["KeyD"])
                pasoCumplido = true;
        }
        // Paso "saltar"
        if (PASOS[pasoActual] === "saltar") {
            if (teclas["ArrowUp"] || teclas["KeyW"])
                pasoCumplido = true;
        }
        // Paso "doble_salto" requiere dos saltos en el aire
        if (PASOS[pasoActual] === "doble_salto") {
            // Lo validamos en movimiento
        }
        // Atacar
        if (e.code === "KeyF" && PASOS[pasoActual] === "atacar") atacandoTim = true;
        if (e.code === "KeyG" && PASOS[pasoActual] === "disparar") disparandoJhoabxi = true;
    });
    document.addEventListener("keyup", e => {
        teclas[e.code] = false;
        if (e.code === "KeyF") atacandoTim = false;
        if (e.code === "KeyG") disparandoJhoabxi = false;
    });
    canvas.addEventListener("mousemove", e => {
        const rect = canvas.getBoundingClientRect();
        const mx = e.clientX - rect.left;
        const my = e.clientY - rect.top;
        botonSiguiente.hover = mx > botonSiguiente.x && mx < botonSiguiente.x + botonSiguiente.width &&
            my > botonSiguiente.y && my < botonSiguiente.y + botonSiguiente.height;
    });
    canvas.addEventListener("click", e => {
        if (pasoCumplido && botonSiguiente.hover) {
            pasoActual++;
            pasoCumplido = false;
            resetPaso();
        }
    });

    // ======= DRAW Y LÓGICA DEL TUTORIAL =======
    function drawButton(btn, text, options = {}) {
        let gradColors = options.gradColors || ["#0FF", "#00F0A0"];
        let borderColor = options.borderColor || "#FFF";
        let shadowColor = options.shadowColor || "#00FFB4";
        let fontColor = options.fontColor || "#000";
        let fontSize = options.fontSize || 26;
        let borderWidth = options.borderWidth || 5;
        let hover = btn.hover;
        let grad = ctx.createLinearGradient(btn.x, btn.y, btn.x + btn.width, btn.y + btn.height);
        grad.addColorStop(0, gradColors[0]);
        grad.addColorStop(1, gradColors[1]);
        ctx.save();
        ctx.shadowColor = shadowColor;
        ctx.shadowBlur = hover ? 35 : 16;
        ctx.lineWidth = borderWidth;
        ctx.strokeStyle = borderColor;
        ctx.beginPath();
        let r = 16;
        ctx.moveTo(btn.x + r, btn.y);
        ctx.lineTo(btn.x + btn.width - r, btn.y);
        ctx.quadraticCurveTo(btn.x + btn.width, btn.y, btn.x + btn.width, btn.y + r);
        ctx.lineTo(btn.x + btn.width, btn.y + btn.height - r);
        ctx.quadraticCurveTo(btn.x + btn.width, btn.y + btn.height, btn.x + btn.width - r, btn.y + btn.height);
        ctx.lineTo(btn.x + r, btn.y + btn.height);
        ctx.quadraticCurveTo(btn.x, btn.y + btn.height, btn.x, btn.y + btn.height - r);
        ctx.lineTo(btn.x, btn.y + r);
        ctx.quadraticCurveTo(btn.x, btn.y, btn.x + r, btn.y);
        ctx.closePath();
        ctx.fillStyle = grad;
        ctx.fill();
        ctx.stroke();
        ctx.shadowBlur = 0;
        ctx.font = `${fontSize}px 'Press Start 2P', Arial, sans-serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.shadowColor = "#000";
        ctx.shadowBlur = 7;
        ctx.fillStyle = fontColor;
        ctx.fillText(text, btn.x + btn.width / 2, btn.y + btn.height / 2 + 2);
        ctx.restore();
    }

    function drawBackground() {
        ctx.fillStyle = "#87CEEB";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = suelo.color;
        ctx.fillRect(suelo.x, suelo.y, suelo.width, suelo.height);
        for (let plataforma of plataformas) {
            ctx.fillStyle = plataforma.color;
            ctx.fillRect(plataforma.x, plataforma.y, plataforma.width, plataforma.height);
        }
    }

    function drawJugadores() {
        ctx.font = "10px 'Press Start 2P', Arial, sans-serif";
        ctx.textAlign = "center";
        for (let jugador of jugadores) {
            // Parpadeo si fue golpeado
            let parpadeo = (Date.now() - lastHitTime < TIEMPO_PARPADEO) && PASOS[pasoActual] === "esquivar";
            if (parpadeo) {
                ctx.globalAlpha = 0.3 + 0.7 * Math.sin(Date.now() / 80);
            }
            ctx.fillStyle = jugador.color;
            ctx.fillRect(jugador.x, jugador.y, jugador.width, jugador.height);
            ctx.globalAlpha = 1;
            ctx.fillText(jugador.nombre, jugador.x + jugador.width / 2, jugador.y - 10);

            if (jugador.nombre === "Timbelsito" && atacandoTim && PASOS[pasoActual] === "atacar") {
                ctx.fillStyle = "#FFFF66";
                if (direccionTim === 1) {
                    ctx.fillRect(jugador.x + jugador.width, jugador.y + 10, 40, 20);
                } else {
                    ctx.fillRect(jugador.x - 40, jugador.y + 10, 40, 20);
                }
            }
        }
    }

    function drawEnemigos() {
        for (let enemigo of enemigos) {
            if (enemigo.vida > 0) {
                ctx.fillStyle = enemigo.color || "#8B0000";
                ctx.fillRect(enemigo.x, enemigo.y, enemigo.width, enemigo.height);
                ctx.strokeStyle = "#FFF";
                ctx.lineWidth = 2;
                ctx.strokeRect(enemigo.x, enemigo.y, enemigo.width, enemigo.height);
            }
        }
    }

    // Lógica de movimiento tutorial
    let dobleSaltoCount = 0;
    function actualizarJugadores() {
        for (let idx = 0; idx < jugadores.length; idx++) {
            let jugador = jugadores[idx];
            let moviendose = false;
            if (teclas[jugador.izquierda]) {
                jugador.velX = -jugador.velocidad;
                moviendose = true;
                if (PASOS[pasoActual] === "mover") pasoCumplido = true;
            } else if (teclas[jugador.derecha]) {
                jugador.velX = jugador.velocidad;
                moviendose = true;
                if (PASOS[pasoActual] === "mover") pasoCumplido = true;
            } else {
                jugador.velX = 0;
            }
            if (teclas[jugador.saltar]) {
                if (jugador.puedeSaltar && jugador.saltosDisponibles > 0) {
                    jugador.velY = jugador.salto;
                    jugador.puedeSaltar = false;
                    jugador.saltosDisponibles--;
                    // Para doble salto
                    if (PASOS[pasoActual] === "doble_salto") dobleSaltoCount++;
                }
            } else {
                jugador.puedeSaltar = true;
            }
            jugador.velY += gravedad;
            jugador.x += jugador.velX;
            jugador.y += jugador.velY;
            jugador.enElSuelo = false;
            if (jugador.x < 0) jugador.x = 0;
            if (jugador.x + jugador.width > suelo.width) jugador.x = suelo.width - jugador.width;
            // suelo
            if (colisiona(jugador, suelo)) {
                jugador.y = suelo.y - jugador.height;
                jugador.velY = 0;
                jugador.enElSuelo = true;
                jugador.saltosDisponibles = 2;
                if (PASOS[pasoActual] === "doble_salto") dobleSaltoCount = 0;
            }
            // plataformas
            for (let plataforma of plataformas) {
                if (colisiona(jugador, plataforma)) {
                    if (jugador.velY > 0 && jugador.y + jugador.height - jugador.velY <= plataforma.y) {
                        jugador.y = plataforma.y - jugador.height;
                        jugador.velY = 0;
                        jugador.enElSuelo = true;
                        jugador.saltosDisponibles = 2;
                        if (PASOS[pasoActual] === "doble_salto") dobleSaltoCount = 0;
                    }
                }
            }
            if (jugador.y + jugador.height > canvas.height) {
                jugador.y = suelo.y - jugador.height;
                jugador.velY = 0;
                jugador.enElSuelo = true;
                jugador.saltosDisponibles = 2;
                if (PASOS[pasoActual] === "doble_salto") dobleSaltoCount = 0;
            }
        }
        // Validación de doble salto
        if (PASOS[pasoActual] === "doble_salto" && dobleSaltoCount >= 2) pasoCumplido = true;
    }

    // Ataque y disparo tutorial
    function actualizarTutorialAtaque() {
        if (PASOS[pasoActual] === "atacar" && atacandoTim) {
            let jugador = jugadores[0];
            let alcance = 40;
            for (let enemigo of enemigos) {
                if (enemigo.vida > 0) {
                    let ataque = {
                        x: direccionTim === 1 ? jugador.x + jugador.width : jugador.x - alcance,
                        y: jugador.y + 10,
                        width: alcance,
                        height: 20
                    };
                    if (colisiona(ataque, enemigo)) {
                        enemigo.vida -= 30;
                        pasoCumplido = true;
                    }
                }
            }
        }
        if (PASOS[pasoActual] === "disparar" && disparandoJhoabxi) {
            let jugador = jugadores[1];
            if (jugador.balaCooldown > 0) jugador.balaCooldown--;
            let enemigo = enemigos[0];
            if (jugador.balaCooldown === 0 && enemigo.vida > 0) {
                let ox = jugador.x + jugador.width / 2;
                let oy = jugador.y + jugador.height / 2;
                let ex = enemigo.x + enemigo.width / 2;
                let ey = enemigo.y + enemigo.height / 2;
                let dx = ex - ox, dy = ey - oy;
                let dist = Math.sqrt(dx * dx + dy * dy);
                let vel = 9;
                balas.push({
                    x: ox, y: oy, vx: (dx / dist) * vel, vy: (dy / dist) * vel, radio: 9, color: "#003366", danio: 30
                });
                jugador.balaCooldown = 18;
            }
        }
        // Colisión bala-enemigo
        for (let i = balas.length - 1; i >= 0; i--) {
            let bala = balas[i];
            let enemigo = enemigos[0];
            if (enemigo && enemigo.vida > 0) {
                let rect = { x: enemigo.x, y: enemigo.y, width: enemigo.width, height: enemigo.height };
                let balaRect = { x: bala.x - bala.radio, y: bala.y - bala.radio, width: bala.radio * 2, height: bala.radio * 2 };
                if (colisiona(balaRect, rect)) {
                    enemigo.vida -= 30;
                    balas.splice(i, 1);
                    pasoCumplido = true;
                }
            }
        }
    }

    // Esquivar balas (arreglado)
    function actualizarTutorialEsquivar() {
        let enemigo = enemigos[0];
        if (!enemigo) return;
        // Dispara balas cada segundo
        if (!esquivarInicio) esquivarInicio = Date.now();
        let ahora = Date.now();
        if (ahora - esquivarInicio > 1000) {
            balasEnemigas.push({
                x: enemigo.x,
                y: enemigo.y + enemigo.height / 2,
                vx: -6,
                vy: 0,
                radio: 12,
                color: "#00D0FF",
                yaContada: false // nueva propiedad
            });
            esquivarInicio = ahora;
        }
        // Colisión bala-jugador (círculo vs rectángulo)
        for (let i = balasEnemigas.length - 1; i >= 0; i--) {
            let bala = balasEnemigas[i];
            let tocado = false;
            for (let jugador of jugadores) {
                if (circleRectCollision(
                    bala.x, bala.y, bala.radio,
                    jugador.x, jugador.y, jugador.width, jugador.height
                )) {
                    // Si alguna bala toca, reinicia contador y marca golpe visual
                    esquivadasCorrectas = 0;
                    lastHitTime = Date.now();
                    // Opcional: elimina la bala tras el golpe
                    balasEnemigas.splice(i, 1);
                    tocado = true;
                    break;
                }
            }
            if (tocado) continue;
            // Si la bala ya pasó por la izquierda y no tocó, cuenta como esquivada
            if (!bala.yaContada && bala.x + bala.radio < 0) {
                esquivadasCorrectas++;
                bala.yaContada = true;
            }
        }
        // Elimina balas fuera de pantalla
        for (let i = balasEnemigas.length - 1; i >= 0; i--) {
            let bala = balasEnemigas[i];
            if (bala.x + bala.radio < 0 || bala.x - bala.radio > suelo.width) {
                balasEnemigas.splice(i, 1);
            }
        }
        // Si sobreviviste 3 disparos seguidos, cumple
        if (esquivadasCorrectas >= 3) pasoCumplido = true;
    }

    function actualizarBalas() {
        for (let i = balas.length - 1; i >= 0; i--) {
            let bala = balas[i];
            bala.x += bala.vx;
            bala.y += bala.vy;
            if (bala.x < 0 || bala.x > suelo.width || bala.y < 0 || bala.y > canvas.height) {
                balas.splice(i, 1);
            }
        }
        for (let i = balasEnemigas.length - 1; i >= 0; i--) {
            let bala = balasEnemigas[i];
            bala.x += bala.vx;
            bala.y += bala.vy;
            // (eliminación extra ahora está en esquivar)
        }
    }

    function drawBalas() {
        for (let bala of balas) {
            ctx.save();
            ctx.beginPath();
            ctx.arc(bala.x, bala.y, bala.radio, 0, Math.PI * 2);
            ctx.fillStyle = bala.color || "#003366";
            ctx.globalAlpha = 0.94;
            ctx.fill();
            ctx.lineWidth = 3;
            ctx.strokeStyle = "#FFF";
            ctx.stroke();
            ctx.restore();
        }
        for (let bala of balasEnemigas) {
            ctx.save();
            ctx.beginPath();
            ctx.arc(bala.x, bala.y, bala.radio, 0, Math.PI * 2);
            ctx.fillStyle = bala.color || "#FF5050";
            ctx.globalAlpha = 0.94;
            ctx.fill();
            ctx.lineWidth = 2;
            ctx.strokeStyle = "#FFF";
            ctx.stroke();
            ctx.restore();
        }
    }

    // ======== TEXTO/PASOS DEL TUTORIAL ==========
    function drawTutorialText() {
        ctx.save();
        ctx.font = "28px 'Press Start 2P', Arial, sans-serif";
        ctx.fillStyle = "#222";
        ctx.textAlign = "center";
        let y = 80;
        let line2 = "";
        switch(PASOS[pasoActual]) {
            case "intro":
                ctx.fillText("¡Bienvenido al Tutorial de Salvando Otare!", canvas.width/2, y);
                ctx.font = "22px 'Press Start 2P', Arial, sans-serif";
                ctx.fillText("Aprende los controles paso a paso.", canvas.width/2, y+40);
                pasoCumplido = true;
                break;
            case "mover":
                ctx.fillText("Paso 1: Mueve a tus personajes", canvas.width/2, y);
                ctx.font = "18px 'Press Start 2P', Arial, sans-serif";
                ctx.fillText("Timbelsito: Flechas ← →   |   Jhoabxi: A / D", canvas.width/2, y+40);
                break;
            case "saltar":
                ctx.fillText("Paso 2: Salta con tus personajes", canvas.width/2, y);
                ctx.font = "18px 'Press Start 2P', Arial, sans-serif";
                ctx.fillText("Timbelsito: ↑   |   Jhoabxi: W", canvas.width/2, y+40);
                break;
            case "doble_salto":
                ctx.fillText("Paso 3: Haz doble salto", canvas.width/2, y);
                ctx.font = "18px 'Press Start 2P', Arial, sans-serif";
                ctx.fillText("Presiona salto dos veces antes de tocar el suelo.", canvas.width/2, y+40);
                break;
            case "atacar":
                ctx.fillText("Paso 4: Ataca con Timbelsito", canvas.width/2, y);
                ctx.font = "18px 'Press Start 2P', Arial, sans-serif";
                ctx.fillText("Acércate al enemigo y presiona F", canvas.width/2, y+40);
                break;
            case "disparar":
                ctx.fillText("Paso 5: Dispara con Jhoabxi", canvas.width/2, y);
                ctx.font = "18px 'Press Start 2P', Arial, sans-serif";
                ctx.fillText("Presiona G para disparar al enemigo", canvas.width/2, y+40);
                break;
            case "esquivar":
                ctx.fillText("Paso 6: Esquiva los disparos enemigos", canvas.width/2, y);
                ctx.font = "18px 'Press Start 2P', Arial, sans-serif";
                ctx.fillText("Muévete y salta para no ser alcanzado por las balas.", canvas.width/2, y+40);
                ctx.font = "16px 'Press Start 2P', Arial, sans-serif";
                ctx.fillStyle = esquivadasCorrectas > 0 ? "#007700" : "#222";
                ctx.fillText("¡Esquiva 3 balas seguidas! (" + esquivadasCorrectas + "/3)", canvas.width/2, y+85);
                break;
            case "final":
                ctx.fillText("¡Tutorial completado!", canvas.width/2, y);
                ctx.font = "22px 'Press Start 2P', Arial, sans-serif";
                ctx.fillText("Ya sabes controlar a ambos personajes.", canvas.width/2, y+40);
                ctx.fillText("¡Ahora puedes jugar y salvar Otare!", canvas.width/2, y+80);
                break;
        }
        ctx.restore();
    }

    // ====== LOOP PRINCIPAL ======
    function loop() {
        drawBackground();
        drawJugadores();
        drawEnemigos();
        drawBalas();
        drawTutorialText();

        if (PASOS[pasoActual] === "atacar" || PASOS[pasoActual] === "disparar") actualizarTutorialAtaque();
        if (PASOS[pasoActual] === "esquivar") actualizarTutorialEsquivar();
        actualizarJugadores();
        actualizarBalas();

        // Mostrar botón Siguiente si cumplió paso
        if (pasoCumplido) {
            drawButton(botonSiguiente, pasoActual === PASOS.length-1 ? "TERMINAR" : "SIGUIENTE");
        }

        requestAnimationFrame(loop);
    }
    loop();
};
