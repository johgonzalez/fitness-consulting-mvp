import { createHash } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const SOURCE_COMMIT = "b0eed061e1c832b3ed815fbaa4b45b3cdc14df49";
const UUID_NAMESPACE = "6e5cb595-a3c4-4f54-a4de-e52c92f6e98e";
const here = dirname(fileURLToPath(import.meta.url));
const outputPath = resolve(here, "../../data/exercises/catalog-v1.json");

const groups = {
  quadriceps: [
    ["agachamento-livre", "Agachamento livre", ["barbell"], ["glutes", "core"], "squat"],
    ["agachamento-goblet", "Agachamento goblet", ["dumbbell"], ["glutes", "core"], "squat"],
    ["agachamento-frontal", "Agachamento frontal", ["barbell"], ["glutes", "core"], "squat"],
    ["agachamento-na-caixa", "Agachamento na caixa", ["barbell", "bench"], ["glutes"], "squat"],
    ["agachamento-no-smith", "Agachamento no Smith", ["machine"], ["glutes"], "squat"],
    ["agachamento-hack", "Agachamento hack", ["machine"], ["glutes"], "squat"],
    ["leg-press-45", "Leg press 45°", ["machine"], ["glutes", "hamstrings"], "squat"],
    ["leg-press-horizontal", "Leg press horizontal", ["machine"], ["glutes"], "squat"],
    ["cadeira-extensora", "Cadeira extensora", ["machine"], [], "knee_extension"],
    ["cadeira-extensora-unilateral", "Cadeira extensora unilateral", ["machine"], [], "knee_extension"],
    ["afundo", "Afundo", ["bodyweight"], ["glutes"], "lunge"],
    ["avanco-reverso-com-halteres", "Avanço reverso com halteres", ["dumbbell"], ["glutes"], "lunge"],
    ["passada-caminhando", "Passada caminhando", ["dumbbell"], ["glutes"], "lunge"],
    ["agachamento-bulgaro", "Agachamento búlgaro (Bulgarian split squat)", ["dumbbell", "bench"], ["glutes"], "lunge"],
    ["step-up-no-banco", "Step-up no banco", ["dumbbell", "bench"], ["glutes"], "lunge"],
    ["spanish-squat", "Spanish squat com faixa", ["resistance_band"], ["glutes"], "squat"],
    ["wall-sit", "Agachamento isométrico na parede", ["bodyweight"], ["glutes"], "squat"],
    ["step-down", "Step-down controlado", ["bench"], ["glutes"], "lunge"],
  ],
  hamstrings: [
    ["mesa-flexora", "Mesa flexora", ["machine"], ["calves"], "knee_flexion"],
    ["cadeira-flexora", "Cadeira flexora", ["machine"], ["calves"], "knee_flexion"],
    ["flexora-em-pe", "Flexora em pé", ["machine"], ["calves"], "knee_flexion"],
    ["flexora-unilateral-com-faixa", "Flexora unilateral com faixa", ["resistance_band"], ["calves"], "knee_flexion"],
    ["levantamento-terra-romeno", "Levantamento terra romeno", ["barbell"], ["glutes", "back"], "hinge"],
    ["terra-romeno-com-halteres", "Terra romeno com halteres", ["dumbbell"], ["glutes"], "hinge"],
    ["terra-romeno-unilateral", "Terra romeno unilateral", ["dumbbell"], ["glutes", "core"], "hinge"],
    ["stiff-com-barra", "Stiff com barra", ["barbell"], ["glutes", "back"], "hinge"],
    ["good-morning", "Good morning", ["barbell"], ["glutes", "back"], "hinge"],
    ["nordic-curl", "Nordic curl", ["bodyweight"], ["glutes"], "knee_flexion"],
    ["flexora-deslizante", "Flexora deslizante", ["bodyweight"], ["glutes", "core"], "knee_flexion"],
    ["glute-ham-raise", "Glute ham raise", ["machine"], ["glutes", "calves"], "knee_flexion"],
    ["levantamento-terra-convencional", "Levantamento terra convencional", ["barbell"], ["glutes", "back", "core"], "hinge"],
    ["swing-com-kettlebell-posterior", "Swing com kettlebell", ["kettlebell"], ["glutes", "core"], "hinge"],
  ],
  glutes: [
    ["hip-thrust", "Hip thrust", ["barbell", "bench"], ["hamstrings", "core"], "hip_extension"],
    ["hip-thrust-na-maquina", "Hip thrust na máquina", ["machine"], ["hamstrings"], "hip_extension"],
    ["hip-thrust-unilateral", "Hip thrust unilateral", ["bodyweight", "bench"], ["hamstrings", "core"], "hip_extension"],
    ["ponte-de-gluteos", "Ponte de glúteos", ["bodyweight"], ["hamstrings"], "hip_extension"],
    ["ponte-de-gluteos-unilateral", "Ponte de glúteos unilateral", ["bodyweight"], ["hamstrings", "core"], "hip_extension"],
    ["frog-pump", "Frog pump", ["bodyweight"], ["hamstrings"], "hip_extension"],
    ["coice-no-cabo", "Coice de glúteo no cabo", ["cable"], ["hamstrings"], "hip_extension"],
    ["coice-com-faixa", "Coice de glúteo com faixa", ["resistance_band"], ["hamstrings"], "hip_extension"],
    ["abducao-de-quadril-maquina", "Abdução de quadril na máquina", ["machine"], [], "hip_abduction"],
    ["abducao-de-quadril-faixa", "Abdução de quadril com faixa", ["resistance_band"], [], "hip_abduction"],
    ["levantamento-terra-sumo", "Levantamento terra sumo", ["barbell"], ["quadriceps", "hamstrings"], "hinge"],
    ["agachamento-sumo", "Agachamento sumo", ["dumbbell"], ["quadriceps", "hamstrings"], "squat"],
    ["afundo-lateral", "Afundo lateral", ["dumbbell"], ["quadriceps", "hamstrings"], "lunge"],
    ["afundo-curtsy", "Afundo curtsy", ["dumbbell"], ["quadriceps"], "lunge"],
    ["step-up-lateral", "Step-up lateral", ["dumbbell", "bench"], ["quadriceps"], "lunge"],
  ],
  calves: [
    ["panturrilha-em-pe", "Panturrilha em pé", ["machine"], [], "calf_raise"],
    ["panturrilha-em-pe-peso-corporal", "Panturrilha em pé com peso corporal", ["bodyweight"], [], "calf_raise"],
    ["panturrilha-unilateral", "Panturrilha unilateral", ["dumbbell"], [], "calf_raise"],
    ["panturrilha-sentada", "Panturrilha sentada", ["machine"], [], "calf_raise"],
    ["panturrilha-sentada-com-halter", "Panturrilha sentada com halter", ["dumbbell", "bench"], [], "calf_raise"],
    ["panturrilha-no-leg-press", "Panturrilha no leg press", ["machine"], [], "calf_raise"],
    ["panturrilha-no-smith", "Panturrilha no Smith", ["machine"], [], "calf_raise"],
    ["panturrilha-donkey", "Panturrilha donkey", ["bodyweight", "bench"], [], "calf_raise"],
    ["panturrilha-com-kettlebell", "Panturrilha com kettlebell", ["kettlebell"], [], "calf_raise"],
    ["saltos-de-panturrilha", "Saltos de panturrilha", ["bodyweight"], ["quadriceps"], "jump"],
    ["elevacao-tibial", "Elevação tibial", ["bodyweight"], [], "tibialis_raise"],
    ["mobilidade-de-tornozelo", "Mobilidade de tornozelo", ["bodyweight"], [], "mobility"],
  ],
  chest: [
    ["supino-reto-com-barra", "Supino reto com barra", ["barbell", "bench"], ["triceps", "shoulders"], "horizontal_push"],
    ["supino-com-halteres", "Supino com halteres", ["dumbbell", "bench"], ["triceps", "shoulders"], "horizontal_push"],
    ["supino-inclinado-com-barra", "Supino inclinado com barra", ["barbell", "bench"], ["triceps", "shoulders"], "horizontal_push"],
    ["supino-inclinado-com-halteres", "Supino inclinado com halteres", ["dumbbell", "bench"], ["triceps", "shoulders"], "horizontal_push"],
    ["supino-declinado-com-barra", "Supino declinado com barra", ["barbell", "bench"], ["triceps", "shoulders"], "horizontal_push"],
    ["supino-declinado-com-halteres", "Supino declinado com halteres", ["dumbbell", "bench"], ["triceps", "shoulders"], "horizontal_push"],
    ["crucifixo-com-halteres", "Crucifixo com halteres", ["dumbbell", "bench"], ["shoulders"], "fly"],
    ["crucifixo-no-cabo", "Crucifixo no cabo", ["cable"], ["shoulders"], "fly"],
    ["crucifixo-na-maquina", "Crucifixo na máquina", ["machine"], ["shoulders"], "fly"],
    ["flexao-de-braco", "Flexão de braço", ["bodyweight"], ["triceps", "shoulders", "core"], "horizontal_push"],
    ["flexao-inclinada", "Flexão inclinada para peito", ["bodyweight", "bench"], ["triceps", "shoulders"], "horizontal_push"],
    ["flexao-declinada", "Flexão declinada", ["bodyweight", "bench"], ["triceps", "shoulders", "core"], "horizontal_push"],
    ["mergulho-para-peito", "Mergulho para peito", ["bodyweight"], ["triceps", "shoulders"], "horizontal_push"],
    ["squeeze-press", "Squeeze press com halteres", ["dumbbell", "bench"], ["triceps"], "horizontal_push"],
    ["crossover-no-cabo", "Crossover no cabo", ["cable"], ["shoulders"], "fly"],
    ["mobilidade-de-peito", "Mobilidade de peito na parede", ["bodyweight"], ["shoulders"], "mobility"],
  ],
  back: [
    ["puxada-frontal", "Puxada frontal", ["cable"], ["biceps", "shoulders"], "vertical_pull"],
    ["puxada-neutra-no-cabo", "Puxada neutra no cabo", ["cable"], ["biceps"], "vertical_pull"],
    ["barra-fixa-assistida", "Barra fixa assistida", ["machine", "pullup_bar"], ["biceps"], "vertical_pull"],
    ["barra-fixa", "Barra fixa", ["bodyweight", "pullup_bar"], ["biceps", "core"], "vertical_pull"],
    ["chin-up", "Chin-up na barra", ["bodyweight", "pullup_bar"], ["biceps"], "vertical_pull"],
    ["remada-curvada", "Remada curvada", ["barbell"], ["biceps", "hamstrings", "core"], "horizontal_pull"],
    ["remada-pendlay", "Remada Pendlay", ["barbell"], ["biceps", "core"], "horizontal_pull"],
    ["remada-baixa", "Remada baixa no cabo", ["cable"], ["biceps"], "horizontal_pull"],
    ["remada-unilateral", "Remada unilateral com halter", ["dumbbell", "bench"], ["biceps"], "horizontal_pull"],
    ["remada-t", "Remada T", ["machine"], ["biceps"], "horizontal_pull"],
    ["remada-apoiada-no-banco", "Remada apoiada no banco", ["dumbbell", "bench"], ["biceps"], "horizontal_pull"],
    ["remada-na-maquina", "Remada na máquina", ["machine"], ["biceps"], "horizontal_pull"],
    ["pulldown-bracos-estendidos", "Pulldown com braços estendidos", ["cable"], ["triceps", "core"], "vertical_pull"],
    ["pullover-com-halter", "Pullover com halter", ["dumbbell", "bench"], ["chest", "triceps"], "pullover"],
    ["remada-invertida", "Remada invertida", ["bodyweight", "barbell"], ["biceps", "core"], "horizontal_pull"],
    ["remada-landmine", "Remada landmine com barra", ["barbell"], ["biceps"], "horizontal_pull"],
    ["rack-pull", "Rack pull", ["barbell"], ["hamstrings", "glutes"], "hinge"],
    ["levantamento-terra-para-costas", "Levantamento terra para costas", ["barbell"], ["hamstrings", "glutes", "core"], "hinge"],
    ["remada-com-faixa", "Remada para costas com faixa", ["resistance_band"], ["biceps"], "horizontal_pull"],
    ["mobilidade-de-costas", "Mobilidade de costas em quatro apoios", ["bodyweight"], ["core"], "mobility"],
  ],
  shoulders: [
    ["desenvolvimento-com-halteres", "Desenvolvimento com halteres", ["dumbbell", "bench"], ["triceps"], "vertical_push"],
    ["desenvolvimento-militar", "Desenvolvimento militar com barra", ["barbell"], ["triceps", "core"], "vertical_push"],
    ["desenvolvimento-arnold", "Desenvolvimento Arnold", ["dumbbell", "bench"], ["triceps"], "vertical_push"],
    ["desenvolvimento-na-maquina", "Desenvolvimento na máquina", ["machine"], ["triceps"], "vertical_push"],
    ["elevacao-lateral", "Elevação lateral", ["dumbbell"], [], "shoulder_abduction"],
    ["elevacao-lateral-no-cabo", "Elevação lateral no cabo", ["cable"], [], "shoulder_abduction"],
    ["elevacao-lateral-na-maquina", "Elevação lateral na máquina", ["machine"], [], "shoulder_abduction"],
    ["elevacao-frontal", "Elevação frontal", ["dumbbell"], ["chest"], "shoulder_flexion"],
    ["crucifixo-inverso", "Crucifixo inverso", ["dumbbell", "bench"], ["back"], "shoulder_external_rotation"],
    ["voador-inverso", "Voador inverso na máquina", ["machine"], ["back"], "shoulder_external_rotation"],
    ["face-pull", "Face pull", ["cable"], ["back"], "shoulder_external_rotation"],
    ["remada-alta", "Remada alta", ["barbell"], ["back", "biceps"], "shoulder_abduction"],
    ["rotacao-externa-com-faixa", "Rotação externa com faixa", ["resistance_band"], [], "shoulder_external_rotation"],
    ["rotacao-externa-no-cabo", "Rotação externa no cabo", ["cable"], [], "shoulder_external_rotation"],
    ["elevacao-y", "Elevação em Y", ["dumbbell", "bench"], ["back"], "scapular_control"],
    ["wall-slide", "Deslizamento escapular na parede", ["bodyweight"], ["back"], "scapular_control"],
    ["pike-push-up", "Pike push-up", ["bodyweight"], ["triceps", "core"], "vertical_push"],
    ["landmine-press", "Landmine press unilateral", ["barbell"], ["chest", "triceps", "core"], "vertical_push"],
  ],
  biceps: [
    ["rosca-direta", "Rosca direta", ["barbell"], ["forearms"], "elbow_flexion"],
    ["rosca-alternada", "Rosca alternada", ["dumbbell"], ["forearms"], "elbow_flexion"],
    ["rosca-martelo", "Rosca martelo", ["dumbbell"], ["forearms"], "elbow_flexion"],
    ["rosca-inclinada", "Rosca inclinada com halteres", ["dumbbell", "bench"], ["forearms"], "elbow_flexion"],
    ["rosca-scott", "Rosca Scott", ["barbell", "bench"], ["forearms"], "elbow_flexion"],
    ["rosca-na-maquina", "Rosca na máquina", ["machine"], ["forearms"], "elbow_flexion"],
    ["rosca-no-cabo", "Rosca direta no cabo", ["cable"], ["forearms"], "elbow_flexion"],
    ["rosca-concentrada", "Rosca concentrada", ["dumbbell", "bench"], ["forearms"], "elbow_flexion"],
    ["rosca-spider", "Rosca spider", ["dumbbell", "bench"], ["forearms"], "elbow_flexion"],
    ["rosca-barra-ez", "Rosca com barra EZ", ["barbell"], ["forearms"], "elbow_flexion"],
    ["rosca-inversa", "Rosca inversa", ["barbell"], ["forearms"], "elbow_flexion"],
    ["rosca-zottman", "Rosca Zottman", ["dumbbell"], ["forearms"], "elbow_flexion"],
    ["rosca-bayesiana", "Rosca bayesiana no cabo", ["cable"], ["forearms"], "elbow_flexion"],
    ["rosca-com-faixa", "Rosca com faixa elástica", ["resistance_band"], ["forearms"], "elbow_flexion"],
  ],
  triceps: [
    ["triceps-na-polia", "Tríceps na polia", ["cable"], [], "elbow_extension"],
    ["triceps-corda", "Tríceps corda no cabo", ["cable"], [], "elbow_extension"],
    ["triceps-frances", "Tríceps francês", ["dumbbell"], [], "elbow_extension"],
    ["triceps-frances-unilateral", "Tríceps francês unilateral", ["dumbbell"], [], "elbow_extension"],
    ["triceps-testa", "Tríceps testa", ["barbell", "bench"], [], "elbow_extension"],
    ["supino-fechado", "Supino fechado", ["barbell", "bench"], ["chest", "shoulders"], "horizontal_push"],
    ["mergulho-no-banco", "Mergulho no banco", ["bodyweight", "bench"], ["chest", "shoulders"], "elbow_extension"],
    ["mergulho-nas-paralelas", "Mergulho nas paralelas", ["bodyweight"], ["chest", "shoulders"], "elbow_extension"],
    ["coice-de-triceps", "Coice de tríceps com halter", ["dumbbell", "bench"], [], "elbow_extension"],
    ["triceps-acima-da-cabeca-cabo", "Tríceps acima da cabeça no cabo", ["cable"], [], "elbow_extension"],
    ["triceps-na-maquina", "Extensão de tríceps na máquina", ["machine"], [], "elbow_extension"],
    ["flexao-diamante", "Flexão diamante", ["bodyweight"], ["chest", "shoulders"], "horizontal_push"],
    ["jm-press", "JM press", ["barbell", "bench"], ["chest"], "elbow_extension"],
    ["tate-press", "Tate press com halteres", ["dumbbell", "bench"], ["chest"], "elbow_extension"],
  ],
  forearms: [
    ["flexao-de-punho-barra", "Flexão de punho com barra", ["barbell", "bench"], [], "wrist_flexion"],
    ["extensao-de-punho-barra", "Extensão de punho com barra", ["barbell", "bench"], [], "wrist_extension"],
    ["flexao-de-punho-halteres", "Flexão de punho com halteres", ["dumbbell", "bench"], [], "wrist_flexion"],
    ["extensao-de-punho-halteres", "Extensão de punho com halteres", ["dumbbell", "bench"], [], "wrist_extension"],
    ["farmer-carry-pegada", "Farmer carry para pegada", ["dumbbell"], ["core", "shoulders"], "carry"],
    ["pinch-grip-halter", "Pinça de halter", ["dumbbell"], [], "grip"],
    ["dead-hang", "Suspensão na barra (dead hang)", ["bodyweight", "pullup_bar"], ["back", "shoulders"], "grip"],
    ["wrist-roller-cabo", "Wrist roller no cabo", ["cable"], [], "grip"],
    ["pronacao-supinacao-halter", "Pronação e supinação com halter", ["dumbbell"], [], "wrist_rotation"],
    ["isometria-de-pegada-kettlebell", "Isometria de pegada com kettlebell", ["kettlebell"], ["shoulders"], "grip"],
  ],
  core: [
    ["prancha", "Prancha", ["bodyweight"], ["shoulders", "glutes"], "anti_extension"],
    ["prancha-lateral", "Prancha lateral", ["bodyweight"], ["shoulders", "glutes"], "anti_lateral_flexion"],
    ["abdominal", "Abdominal", ["bodyweight"], [], "trunk_flexion"],
    ["abdominal-reverso", "Abdominal reverso", ["bodyweight"], [], "trunk_flexion"],
    ["dead-bug", "Dead bug", ["bodyweight"], ["hip_flexors"], "anti_extension"],
    ["pallof-press", "Pallof press", ["cable"], ["shoulders"], "anti_rotation"],
    ["bird-dog", "Bird dog", ["bodyweight"], ["glutes", "shoulders"], "anti_rotation"],
    ["hollow-hold", "Hollow hold", ["bodyweight"], ["hip_flexors"], "anti_extension"],
    ["elevacao-de-joelhos", "Elevação de joelhos na barra", ["bodyweight", "pullup_bar"], ["hip_flexors", "forearms"], "hip_flexion"],
    ["elevacao-de-pernas", "Elevação de pernas", ["bodyweight", "bench"], ["hip_flexors"], "hip_flexion"],
    ["abdominal-no-cabo", "Abdominal no cabo", ["cable"], [], "trunk_flexion"],
    ["rollout-abdominal-no-cabo", "Rollout abdominal no cabo", ["cable"], ["shoulders"], "anti_extension"],
    ["rotacao-russa", "Rotação russa", ["dumbbell"], [], "trunk_rotation"],
    ["wood-chop-alto", "Wood chop alto no cabo", ["cable"], ["shoulders"], "trunk_rotation"],
    ["wood-chop-baixo", "Wood chop baixo no cabo", ["cable"], ["shoulders"], "trunk_rotation"],
    ["mountain-climber", "Mountain climber", ["bodyweight"], ["shoulders", "hip_flexors"], "conditioning"],
    ["bear-crawl-core", "Bear crawl", ["bodyweight"], ["shoulders", "hip_flexors"], "crawl"],
    ["suitcase-carry", "Suitcase carry", ["kettlebell"], ["forearms", "shoulders"], "carry"],
    ["abdominal-bicicleta", "Abdominal bicicleta", ["bodyweight"], ["hip_flexors"], "trunk_rotation"],
    ["abdominal-v-up", "Abdominal V-up", ["bodyweight"], ["hip_flexors"], "trunk_flexion"],
  ],
  full_body: [
    ["burpee", "Burpee", ["bodyweight"], ["chest", "shoulders", "quadriceps", "core"], "conditioning"],
    ["polichinelo", "Polichinelo", ["bodyweight"], ["calves", "shoulders"], "warmup"],
    ["swing-com-kettlebell", "Kettlebell swing", ["kettlebell"], ["glutes", "hamstrings", "core"], "hinge"],
    ["clean-and-press-halteres", "Clean and press com halteres", ["dumbbell"], ["shoulders", "quadriceps", "glutes"], "olympic_lift"],
    ["clean-and-press-kettlebell", "Clean and press com kettlebell", ["kettlebell"], ["shoulders", "quadriceps", "glutes"], "olympic_lift"],
    ["clean-and-press-barra", "Clean and press com barra", ["barbell"], ["shoulders", "quadriceps", "glutes"], "olympic_lift"],
    ["thruster-com-halteres", "Thruster com halteres", ["dumbbell"], ["quadriceps", "shoulders", "triceps"], "conditioning"],
    ["devil-press", "Devil press", ["dumbbell"], ["chest", "shoulders", "quadriceps"], "conditioning"],
    ["turkish-get-up", "Turkish get-up", ["kettlebell"], ["shoulders", "core", "glutes"], "get_up"],
    ["remo-ergometro", "Remo ergométrico", ["cardio_machine"], ["back", "quadriceps", "biceps"], "conditioning"],
    ["bicicleta-ergometrica", "Bicicleta ergométrica", ["cardio_machine"], ["quadriceps", "calves"], "conditioning"],
    ["corrida-na-esteira", "Corrida intervalada na esteira", ["cardio_machine"], ["quadriceps", "hamstrings", "calves"], "conditioning"],
    ["farmer-carry", "Farmer carry", ["kettlebell"], ["forearms", "core", "shoulders"], "carry"],
    ["inchworm", "Inchworm", ["bodyweight"], ["shoulders", "hamstrings", "core"], "warmup"],
    ["man-maker", "Man maker com halteres", ["dumbbell"], ["chest", "back", "shoulders", "quadriceps"], "conditioning"],
    ["snatch-com-halter", "Snatch com halter", ["dumbbell"], ["shoulders", "glutes", "hamstrings"], "olympic_lift"],
    ["salto-na-caixa", "Salto na caixa", ["bench"], ["quadriceps", "glutes", "calves"], "jump"],
    ["mobilidade-de-quadril", "Mobilidade de quadril", ["bodyweight"], ["glutes", "hamstrings"], "mobility"],
    ["mobilidade-de-ombro", "Mobilidade de ombro", ["resistance_band"], ["shoulders", "back"], "mobility"],
  ],
};

const muscleLabels = {
  quadriceps: "quadríceps", hamstrings: "posteriores de coxa", glutes: "glúteos",
  calves: "panturrilhas", chest: "peitoral", back: "costas", shoulders: "ombros",
  biceps: "bíceps", triceps: "tríceps", forearms: "antebraços", core: "core",
  full_body: "corpo inteiro",
};

const equipmentLabels = {
  bodyweight: "peso corporal", barbell: "barra", dumbbell: "halteres", machine: "máquina",
  cable: "cabo", resistance_band: "faixa elástica", kettlebell: "kettlebell", bench: "banco",
  pullup_bar: "barra fixa", cardio_machine: "equipamento cardiovascular",
};

const patternCopy = {
  squat: ["Organize os pés, estabilize o tronco e flexione quadris e joelhos com controle antes de retornar à posição inicial.", ["Mantenha os pés firmes no apoio.", "Acompanhe a direção dos joelhos."]],
  lunge: ["Parta de uma base estável, desloque uma perna e desça com controle, mantendo o tronco organizado antes de retornar.", ["Distribua a pressão por todo o pé da frente.", "Evite perder o alinhamento do joelho."]],
  knee_extension: ["Ajuste o equipamento ao eixo do joelho, estenda as pernas sem impulso e retorne de forma controlada.", ["Mantenha o quadril apoiado.", "Controle a volta até a posição inicial."]],
  knee_flexion: ["Ajuste o apoio ao tornozelo, flexione os joelhos sem retirar o quadril da base e retorne devagar.", ["Evite acelerar a fase de retorno.", "Mantenha a amplitude confortável e controlada."]],
  hinge: ["Mantenha a coluna neutra, leve o quadril para trás e conduza a carga próxima ao corpo antes de estender o quadril.", ["Crie tensão no tronco antes de mover a carga.", "Priorize o movimento do quadril."]],
  hip_extension: ["Estabilize o tronco, estenda o quadril até alinhar a pelve e retorne sem perder o controle.", ["Evite compensar com a lombar.", "Finalize contraindo os glúteos."]],
  hip_abduction: ["Mantenha a pelve estável, afaste a perna contra a resistência e retorne de maneira controlada.", ["Não incline o tronco para gerar impulso.", "Controle as duas fases do movimento."]],
  calf_raise: ["Eleve os calcanhares pela maior amplitude controlada possível, pause no alto e desça sem relaxar bruscamente.", ["Mantenha o apoio distribuído no antepé.", "Evite usar impulso."]],
  tibialis_raise: ["Mantenha os calcanhares apoiados, eleve a ponta dos pés e retorne lentamente.", ["Controle a descida.", "Evite deslocar o quadril."]],
  horizontal_push: ["Organize as escápulas, conduza a resistência à frente do tronco e retorne com controle até a amplitude definida.", ["Mantenha punhos e cotovelos alinhados.", "Preserve o apoio do tronco."]],
  fly: ["Com os cotovelos levemente flexionados, aproxime os braços à frente do peito e retorne sem perder a tensão.", ["Evite transformar o movimento em supino.", "Controle a abertura dos braços."]],
  vertical_pull: ["Inicie com as escápulas organizadas, puxe os cotovelos em direção ao tronco e retorne sem soltar a tensão.", ["Evite balançar o corpo.", "Conduza o movimento pelos cotovelos."]],
  horizontal_pull: ["Estabilize a coluna, leve os cotovelos para trás e aproxime as escápulas antes de retornar controladamente.", ["Não projete a cabeça à frente.", "Evite usar impulso do tronco."]],
  pullover: ["Mantenha o tronco estável, conduza a resistência em arco e retorne até a amplitude que preserve o controle dos ombros.", ["Evite ampliar o arco lombar.", "Mantenha os cotovelos suavemente flexionados."]],
  vertical_push: ["Estabilize o tronco, pressione a resistência acima da cabeça e retorne com os cotovelos sob controle.", ["Evite compensar com a lombar.", "Finalize sem perder a posição das costelas."]],
  shoulder_abduction: ["Eleve os braços lateralmente até a amplitude controlada e retorne sem deixar a resistência cair.", ["Mantenha os ombros afastados das orelhas.", "Use carga compatível com o controle."]],
  shoulder_flexion: ["Eleve os braços à frente mantendo o tronco estável e retorne de forma lenta.", ["Evite embalar o corpo.", "Mantenha os cotovelos suaves."]],
  shoulder_external_rotation: ["Mantenha o cotovelo estável, gire o braço para fora contra a resistência e retorne lentamente.", ["Não force a amplitude.", "Preserve a posição da escápula."]],
  scapular_control: ["Organize as escápulas e mova os braços com amplitude confortável, sem compensar com o tronco.", ["Mantenha o pescoço relaxado.", "Priorize precisão em vez de carga."]],
  elbow_flexion: ["Mantenha os cotovelos estáveis, flexione-os contra a resistência e estenda novamente sem perder o controle.", ["Evite balançar o tronco.", "Controle a extensão completa."]],
  elbow_extension: ["Estabilize os braços, estenda os cotovelos contra a resistência e retorne sem deslocar os ombros.", ["Mantenha os cotovelos apontados de forma consistente.", "Evite usar impulso."]],
  wrist_flexion: ["Apoie os antebraços, mova apenas os punhos pela amplitude controlada e retorne lentamente.", ["Mantenha os antebraços apoiados.", "Use carga leve e controlável."]],
  wrist_extension: ["Apoie os antebraços, eleve o dorso das mãos e retorne sem perder o controle.", ["Evite mover os cotovelos.", "Controle toda a amplitude."]],
  wrist_rotation: ["Com o antebraço apoiado, gire a mão de forma lenta entre pronação e supinação.", ["Mantenha o cotovelo estável.", "Não force o final da amplitude."]],
  grip: ["Assuma uma pegada segura, sustente a posição pelo tempo planejado e encerre antes de perder o controle.", ["Mantenha o punho neutro.", "Não prenda a respiração."]],
  carry: ["Segure a carga com postura alta e caminhe em passos controlados mantendo o tronco estável.", ["Evite inclinar o tronco.", "Mantenha a passada regular."]],
  anti_extension: ["Organize costelas e pelve, mantenha o tronco firme e execute o movimento sem aumentar o arco lombar.", ["Respire mantendo a tensão do core.", "Interrompa antes de perder a posição."]],
  anti_lateral_flexion: ["Alinhe o corpo e resista à inclinação lateral durante todo o tempo planejado.", ["Mantenha quadris alinhados.", "Evite deixar o ombro colapsar."]],
  trunk_flexion: ["Inicie com o abdômen ativo, aproxime costelas e pelve com controle e retorne sem relaxar bruscamente.", ["Evite puxar o pescoço.", "Use uma amplitude confortável."]],
  hip_flexion: ["Estabilize o tronco, eleve as pernas ou joelhos sem embalar e retorne de forma controlada.", ["Evite ampliar o arco lombar.", "Controle a descida."]],
  anti_rotation: ["Mantenha pelve e costelas alinhadas enquanto resiste à força de rotação.", ["Não gire os ombros.", "Respire sem perder a posição."]],
  trunk_rotation: ["Gire o tronco de forma controlada, acompanhando a amplitude com ombros e costelas sem usar impulso.", ["Mantenha a base estável.", "Controle o retorno."]],
  conditioning: ["Execute o padrão em ritmo sustentável, preservando a técnica e ajustando a intensidade ao intervalo planejado.", ["Priorize consistência de movimento.", "Reduza o ritmo antes de perder a técnica."]],
  crawl: ["Desloque mãos e pés de forma coordenada mantendo joelhos baixos e tronco estável.", ["Use passos curtos.", "Evite balançar o quadril."]],
  warmup: ["Execute de forma contínua e leve para elevar gradualmente a temperatura corporal e preparar as articulações.", ["Mantenha ritmo confortável.", "Use amplitude progressiva."]],
  olympic_lift: ["Organize a base, acelere a carga com quadris e pernas e receba-a em posição estável antes de finalizar.", ["Mantenha a carga próxima ao corpo.", "Priorize técnica antes de velocidade."]],
  get_up: ["Passe pelas etapas do solo até ficar em pé mantendo a carga estável e reverta a sequência com controle.", ["Acompanhe a carga com os olhos.", "Não apresse as transições."]],
  jump: ["Prepare a base, produza o salto com braços e pernas coordenados e aterrisse absorvendo o impacto.", ["Aterrisse com controle.", "Mantenha joelhos alinhados aos pés."]],
  mobility: ["Mova a articulação pela amplitude confortável de forma lenta, sem forçar dor ou compensar com outras regiões.", ["Respire de forma natural.", "Aumente a amplitude gradualmente."]],
};

const isolationPatterns = new Set(["knee_extension", "knee_flexion", "hip_abduction", "calf_raise", "tibialis_raise", "fly", "shoulder_abduction", "shoulder_flexion", "shoulder_external_rotation", "elbow_flexion", "elbow_extension", "wrist_flexion", "wrist_extension", "wrist_rotation", "grip"]);

function uuidV5(value) {
  const namespace = Buffer.from(UUID_NAMESPACE.replaceAll("-", ""), "hex");
  const hash = createHash("sha1").update(namespace).update(value).digest();
  hash[6] = (hash[6] & 0x0f) | 0x50;
  hash[8] = (hash[8] & 0x3f) | 0x80;
  const hex = hash.subarray(0, 16).toString("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

function categoryFor(pattern, equipment) {
  if (pattern === "mobility") return "mobility";
  if (pattern === "warmup") return "warmup";
  if (["conditioning", "crawl", "jump"].includes(pattern)) return "conditioning";
  if (isolationPatterns.has(pattern)) return "hypertrophy";
  if (equipment.length === 1 && equipment[0] === "bodyweight") return "bodyweight";
  return "strength";
}

const exercises = Object.entries(groups).flatMap(([primaryMuscleGroup, definitions]) => definitions.map(([slug, name, equipment, secondaryMuscleGroups, movementPattern]) => {
  const copy = patternCopy[movementPattern];
  if (!copy) throw new Error(`Missing copy for movement pattern ${movementPattern}.`);
  const equipmentText = equipment.map((item) => equipmentLabels[item]).join(" e ");
  return {
    id: uuidV5(`pperfil:exercise:${slug}`),
    canonicalId: `pperfil.exercise.${slug}`,
    slug,
    sourceType: "PPERFIL_LIBRARY",
    name,
    description: `Exercício para ${muscleLabels[primaryMuscleGroup]}, realizado com ${equipmentText} e execução controlada dentro do padrão de movimento proposto.`,
    primaryMuscleGroup,
    secondaryMuscleGroups,
    equipment,
    movementPattern,
    category: categoryFor(movementPattern, equipment),
    instructions: copy[0],
    coachingCues: copy[1],
    locale: "pt-BR",
    status: "ACTIVE",
    provenance: {
      kind: "PPERFIL_CURATED_ADAPTATION",
      catalogVersion: "1.0.0",
      referenceDataset: "yuhonas/free-exercise-db",
      referenceCommit: SOURCE_COMMIT,
      mediaImported: false,
    },
    media: [],
  };
}));

const catalog = {
  schemaVersion: "pperfil-exercise-catalog-v1",
  catalogVersion: "1.0.0",
  locale: "pt-BR",
  generatedAt: "2026-08-23T00:00:00.000Z",
  source: {
    name: "yuhonas/free-exercise-db",
    repository: "https://github.com/yuhonas/free-exercise-db",
    snapshotCommit: SOURCE_COMMIT,
    datasetLicense: "Unlicense / public domain dedication",
    licenseUrl: "https://github.com/yuhonas/free-exercise-db/blob/b0eed061e1c832b3ed815fbaa4b45b3cdc14df49/LICENSE.md",
    usage: "Taxonomy and selection reference. Portuguese names, descriptions, instructions and coaching cues are curated for PPerfil.",
  },
  mediaPolicy: {
    imported: false,
    reason: "Dataset image rights are not treated as production-approved by PPerfil.",
  },
  exercises,
};

mkdirSync(dirname(outputPath), { recursive: true });
writeFileSync(outputPath, `${JSON.stringify(catalog, null, 2)}\n`, "utf8");
process.stdout.write(`Wrote ${exercises.length} exercises to ${outputPath}\n`);
