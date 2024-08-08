import { hydrate, prerender as ssr } from 'preact-iso';
import { signal, computed, useSignal, Signal } from '@preact/signals';
import { useRef, useCallback, useState, useEffect } from 'preact/hooks';

import './style.css';

type ReactiveObj<T> = { [K in keyof T]: Signal<T[K]> }

function reactive<T>(obj: T): ReactiveObj<T>;
function reactive<T>(arr: T[]): ReactiveObj<T>[];
function reactive<T extends object>(val: T | T[]) {
	if (Array.isArray(val)) {
		return val.map((v) => reactive(v));
	} else {
		const reactiveObj = {} as ReactiveObj<T>;
		for (let key in val) {
			reactiveObj[key] = signal(val[key]);
		}
		return reactiveObj;
	}
}

enum AppStates {
	Start,
	Rounds,
	Podium,
}
type PlayersState = Signal<Signal<Player>[]>;

enum CardType {
	SquidNigiri = 'squid-nigiri',
	EggNigiri = 'egg-nigiri',
	SalmonNigiri = 'salmon-nigiri',
	Tempura = 'tempura',
	Wasabi = 'wasabi',
	Pudding = 'pudding',
	Sashimi = 'sashimi',
	Dumpling = 'dumpling',
	MakiRoll = 'maki-roll',
	ChopSticks = 'chio-sticks',
}
type NigiriCardType = CardType.SquidNigiri | CardType.EggNigiri | CardType.SalmonNigiri;
type NigiriCard = { cardType: NigiriCardType; wasabi: boolean; id: string; };

type Card =
	| NigiriCard
	| {
		cardType: CardType.MakiRoll;
		amount: number;
		id: string;
	}
	| {
		cardType: Exclude<CardType, NigiriCardType | CardType.MakiRoll>;
		id: string;
	};

function isNigiriCardType(cardType: CardType): cardType is NigiriCardType {
	return cardType === CardType.SquidNigiri || cardType === CardType.EggNigiri || cardType === CardType.SalmonNigiri;
}

function isNigiriCard(card: Signal<Card>): card is Signal<NigiriCard>;
function isNigiriCard(card: Card): card is NigiriCard;
function isNigiriCard(card: Card | Signal<Card>): card is NigiriCard | Signal<NigiriCard> {
	if (card instanceof Signal) {
		return isNigiriCard(card.value);
	}
	return isNigiriCardType(card.cardType);
}

function newCard(cardType: CardType): Card {
	if (isNigiriCardType(cardType)) {
		return { cardType, wasabi: false, id: crypto.randomUUID() };
	}
	if (cardType === CardType.MakiRoll) {
		return { cardType, amount: 0, id: crypto.randomUUID() };
	}
	return { cardType, id: crypto.randomUUID() };
}

type Player = {
	name: Signal<string>;
	cards: Signal<Card[]>;
}

function reactivePlayers(players: Player[]): Signal<Player>[] {
	return players.map((p) => signal(p));
}

function createAppState() {
	const state = signal(AppStates.Start);
	const players: PlayersState = signal<Signal<Player>[]>([]);

	return { state, players };
}
const appState = createAppState();

export function App() {
	const onStart = useCallback(({ players }: { players: Player[] }) => {
	  appState.state.value = AppStates.Rounds;
		appState.players.value = reactivePlayers(players);
	}, [appState.state, appState.players]);

	if (appState.state.value === AppStates.Start) {
		return <StartState onStart={onStart} />;
	}
	if (appState.state.value === AppStates.Rounds) {
		return <RoundsState players={appState.players} />;
	}
	if (appState.state.value === AppStates.Podium) {
		return (
			<div>
				<h1>Podium</h1>
			</div>
		)
	}
}

type OnStartCallback = (props: { players: Player[] }) => void;

function newPlayer() {
	return { name: signal(''), cards: signal<Card[]>([]) };
}

function StartState({ onStart }: { onStart: OnStartCallback }) {
	const [players, setPlayers] = useState([newPlayer()]);
	const formEl = useRef(null);

	function playerIsReady(p: Player) {
		return p.name.value !== '';
	}

	function onInput(p: Player, e: Event) {
		if (e.target instanceof HTMLInputElement) {
			p.name.value = e.target.value;
		}
	}
	
	function onSubmit(e: SubmitEvent) {
		e.preventDefault();
		const readyPlayers = players.filter(playerIsReady);
		if (readyPlayers.length >= 2) {
			onStart({ players: readyPlayers });
		}
	}

	function addPlayer() {
		setPlayers(players.concat([newPlayer()]));
	}

	function removeLastPlayer() {
		setPlayers(players.slice(0, -1));
	}

	const inputRef = useCallback(() => {
		// Focus on first empty input whenever inputs are added or removed.
		if (formEl.current instanceof HTMLElement) {
			const firstEmptyInput = formEl.current.querySelector('input:placeholder-shown');
			if (firstEmptyInput instanceof HTMLInputElement) {
		 		firstEmptyInput.focus();
			} else {
				// No empty input was found, just focus on first input instead
				const firstInput = formEl.current.querySelector('li:first-child input');
				if (firstInput instanceof HTMLInputElement) {
					firstInput.focus();
				}
			}
		}
	}, []);

	useEffect(() => {
		formEl.current.querySelector('input').focus()
	}, []);

	const disableAddPlayer = players.length >= 5;
	const disableRemovePlayer = players.length <= 2;
	const disableStart = players.filter(playerIsReady).length < 2;

	return (
		<form id="start__root" onSubmit={onSubmit} ref={formEl}>
			<h1>Which players?</h1>
			<ul id="start__players">
			{players.map((p) => (
				<li>
					<input
					  type="text"
					  placeholder="Player name"
            class="start__player-input"
				    onInput={(e) => onInput(p, e)}
						ref={inputRef}
					/>
				</li>
			))}
			</ul>
			<div id="start__actions">
				<button
					type="button"
					class="start__action"
          disabled={disableAddPlayer}
          title={disableAddPlayer ? 'Maximum number of players is five' : 'Add another player to the game'}
					onClick={addPlayer}
				>Add player</button>
				<button
					type="button"
					class="start__action"
          disabled={disableRemovePlayer}
          title={disableRemovePlayer ? 'Minimum number of players is two' : 'Remove the last player in the list'}
					onClick={removeLastPlayer}
				>Remove player</button>
				<button
					type="submit"
					class="start__action"
          disabled={disableStart}
          title={disableStart ? 'Need at least two players with names to start' : 'Start the game'}
				>Start</button>
			</div>
		</form>
	);
}

function numCardsPerPlayer(numPlayers: number) {
	switch (numPlayers) {
		case 2:
			return 10;
		case 3:
			return 9;
		case 4:
			return 8;
		case 5:
			return 7;
		default:
			throw new Error(`Unexpected number of players ${numPlayers}`);
	}
}

function RoundsState({ players }: { players: PlayersState }) {
	const numCards = numCardsPerPlayer(players.value.length);

	const allCardsReady = computed(() => (
		players.value.every((p) => p.value.cards.value.length === numCards)
	));

	return (
		<div id="rounds__root">
			{players.value.map((p) => (
				<PlayerCards numCards={numCards} player={p} />
			))}
			{allCardsReady.value && (
				<p>Ready for score counting!</p>
			)}
		</div>
	);
}

function PlayerCards({ numCards, player }: { numCards: number, player: Signal<Player> }) {
	const focusedId = useSignal<string>(null);
	
	const onNewCard = useCallback((card: Card) => {
		player.value.cards.value = player.value.cards.value.concat(card);
		focusedId.value = card.id;
	}, [player.value.cards.value]);

	return (
		<div class="rounds__player-cards">
			<h2>{player.value.name}</h2>
			<SelectedCards cards={player.value.cards} focusedId={focusedId} />
			{focusedId.value && <FocusedCard cards={player.value.cards} focusedId={focusedId} />}
			{numCards > player.value.cards.value.length && <AddCard onNewCard={onNewCard} />}
		</div>
	);
}

function SelectedCards({ cards, focusedId }: { cards: Signal<Card[]>,  focusedId: Signal<string> }) {
	const setFocus = useCallback((card: Card) => {
		focusedId.value = card.id;
	}, [focusedId.value]);
	
	return (
		<div class="rounds__selected-cards">
			{cards.value.map((card, i) => (
				<SelectedCard key={card.id} card={card} onClick={setFocus} />
			))}
		</div>
	)
}

type OnSelectedCardClickedCallback = (c: Card) => void;

function SelectedCard({ card, onClick }: { card: Card, onClick: OnSelectedCardClickedCallback }) {
	return (
		<span onClick={() => onClick(card)}>{card.cardType}</span>
	);
}

function getFocusedCard(cards: Signal<Card[]>, focusedId: Signal<string>): Card {
	return cards.value.find((c) => isFocusedCard(c, focusedId));
}

function isFocusedCard(card: Card, focusedId: Signal<string>): boolean {
	return card.id === focusedId.value
}

function FocusedCard({ focusedId, cards }: { focusedId: Signal<string>, cards: Signal<Card[]> }) {
	let cardEditor = null;
	const focusedCard = computed(() => getFocusedCard(cards, focusedId));

	if (isNigiriCard(focusedCard)) {
		cardEditor = <FocusedNigiri focusedId={focusedId} cards={cards} />;
	}
	
	return (
		<div class="rounds__focused-cards">
			<p>{focusedCard.value.cardType}</p>
			{cardEditor}
		</div>
	);
}

function FocusedNigiri({ cards, focusedId }: { focusedId: Signal<string>, cards: Signal<Card[]> }) {
	const focusedCard = getFocusedCard(cards, focusedId);
	if (!isNigiriCard(focusedCard)) {
		throw new Error('FocusedNigiri: focusedCard is no nigiri');
	}

	function flipWasabi(card: NigiriCard) {
		const newCard = { ...card, wasabi: !card.wasabi }
		cards.value = cards.value.map((c) => isFocusedCard(c, focusedId) ? newCard : c);
	}

	return (
		<label>
			Has wasabi?
			<input
				type="checkbox"
				checked={focusedCard.wasabi}
				onClick={() => flipWasabi(focusedCard)}
			/>
		</label>
	)
}

type OnNewCardCallback = (card: Card) => void;

function AddCard({ onNewCard }: { onNewCard: OnNewCardCallback }) {
	const currentCard = useSignal<Card>(null);	
	function onCardClick(cardType: CardType) {
		currentCard.value = newCard(cardType);
	}
	const onConfirm = useCallback(() => {
		onNewCard(currentCard.value);
	}, [currentCard]);

	return (
		<div class="rounds__add-card">
			<div class="rounds__add-card-choice">
				<button onClick={() => onCardClick(CardType.SquidNigiri)}>Squid nigiri</button>
				<button onClick={() => onCardClick(CardType.EggNigiri)}>Egg nigiri</button>
				<button onClick={() => onCardClick(CardType.SalmonNigiri)}>Salmon nigiri</button>
			</div>
			<div class="rounds__add-card-current">
				{currentCard.value ? (
					<CurrentlySelectedCard card={currentCard.value} onConfirm={onConfirm} />
				): (
					'No card selected'
				)}
			</div>
		</div>
	);
}

type OnConfirmCallback = () => void;

function CurrentlySelectedCard({ card, onConfirm }: { card: Card, onConfirm: OnConfirmCallback }) {
	return (
		<div class="rounds__add-card-confirm">
			<p>{card.cardType}</p>
			<button onClick={() => onConfirm()}>Confirm</button>
		</div>
	);
}

function PodiumState() {
	
}

if (typeof window !== 'undefined') {
	hydrate(<App />, document.getElementById('app'));
}

export async function prerender(data) {
	return await ssr(<App {...data} />);
}
