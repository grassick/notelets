import type { Board, Card, Chat, ChatId } from "./types"
import type { Store } from "./Store"
import { MinimongoLocalDb } from "minimongo"

type Subscriber<T> = (data: T) => void
type Unsubscribe = () => void

type MongoDoc<T> = Omit<T, 'id'> & { _id: string }

/** Convert our application type with id to MiniMongo type with _id */
function toMongo<T extends { id: string }>(doc: T): MongoDoc<T> {
  const { id, ...rest } = doc
  return { ...rest, _id: id }
}

/** Convert MiniMongo type with _id back to our application type with id */
function fromMongo<T extends { id: string }>(doc: MongoDoc<T>): T {
  // We know this cast is safe because we're converting from a type that has all fields of T except 'id',
  // and we're adding back 'id' with the correct value from '_id'
  return { ...doc, id: doc._id } as unknown as T
}

/** Type-safe conversion functions for our specific types */
const convertBoard = {
  toMongo: (board: Board) => toMongo(board),
  fromMongo: (doc: MongoDoc<Board>) => fromMongo<Board>(doc),
}

const convertCard = {
  toMongo: (card: Card) => toMongo(card),
  fromMongo: (doc: MongoDoc<Card>) => fromMongo<Card>(doc),
}

const convertChat = {
  toMongo: (chat: Chat) => toMongo(chat),
  fromMongo: (doc: MongoDoc<Chat>) => fromMongo<Chat>(doc),
}

export class MiniMongoStore implements Store {
  private db: MinimongoLocalDb
  private boardSubscribers = new Set<Subscriber<Board[]>>()
  private boardByIdSubscribers = new Map<string, Set<Subscriber<Board | null>>>()
  private cardsByBoardSubscribers = new Map<string, Set<Subscriber<Card[]>>>()
  private cardByIdSubscribers = new Map<string, Set<Subscriber<Card | null>>>()
  private chatsByBoardSubscribers = new Map<string, Set<Subscriber<Chat[]>>>()
  private chatByIdSubscribers = new Map<string, Set<Subscriber<Chat | null>>>()

  constructor(db: MinimongoLocalDb) {
    this.db = db
    this.db.addCollection("boards")
    this.db.addCollection("cards")
    this.db.addCollection("chats")
  }

  private notifyBoardSubscribers() {
    if (this.boardSubscribers.size > 0) {
      this.db.collections.boards.find({}).fetch().then(boards => {
        const converted = boards.map(doc => fromMongo<Board>(doc))
        this.boardSubscribers.forEach(callback => callback(converted))
      })
    }
  }

  private notifyBoardByIdSubscribers(boardId: string) {
    const subscribers = this.boardByIdSubscribers.get(boardId)
    if (subscribers?.size) {
      this.db.collections.boards.findOne({ _id: boardId }).then(board => {
        const converted = board ? fromMongo<Board>(board) : null
        subscribers.forEach(callback => callback(converted))
      })
    }
  }

  private notifyCardsByBoardSubscribers(boardId: string) {
    const subscribers = this.cardsByBoardSubscribers.get(boardId)
    if (subscribers?.size) {
      this.db.collections.cards.find({ boardId }).fetch().then(cards => {
        const converted = cards.map(doc => fromMongo<Card>(doc))
        subscribers.forEach(callback => callback(converted))
      })
    }
  }

  private notifyCardByIdSubscribers(cardId: string) {
    const subscribers = this.cardByIdSubscribers.get(cardId)
    if (subscribers?.size) {
      this.db.collections.cards.findOne({ _id: cardId }).then(card => {
        const converted = card ? fromMongo<Card>(card) : null
        subscribers.forEach(callback => callback(converted))
      })
    }
  }

  private notifyChatsByBoardSubscribers(boardId: string) {
    const subscribers = this.chatsByBoardSubscribers.get(boardId)
    if (subscribers?.size) {
      this.db.collections.chats.find({ boardId }).fetch().then(chats => {
        const converted = chats.map(doc => fromMongo<Chat>(doc))
        subscribers.forEach(callback => callback(converted))
      })
    }
  }

  private notifyChatByIdSubscribers(chatId: ChatId) {
    const subscribers = this.chatByIdSubscribers.get(chatId)
    if (subscribers?.size) {
      this.db.collections.chats.findOne({ _id: chatId }).then(chat => {
        const converted = chat ? fromMongo<Chat>(chat) : null
        subscribers.forEach(callback => callback(converted))
      })
    }
  }

  async setBoard(board: Board): Promise<void> {
    const doc = toMongo(board)
    await this.db.collections.boards.upsert(doc)
    this.notifyBoardSubscribers()
    this.notifyBoardByIdSubscribers(doc._id)
  }

  async removeBoard(boardId: string): Promise<void> {
    // Get cards and chats to remove
    const cards = await this.db.collections.cards.find({ boardId }).fetch()
    const chats = await this.db.collections.chats.find({ boardId }).fetch()
    
    // Remove everything
    await Promise.all([
      this.db.collections.boards.remove(boardId),
      ...cards.map(card => this.removeCard(card._id)),
      ...chats.map(chat => this.removeChat(chat._id))
    ])

    this.notifyBoardSubscribers()
    this.notifyBoardByIdSubscribers(boardId)
  }

  getBoards(callback: (boards: Board[]) => void): Unsubscribe {
    this.boardSubscribers.add(callback)
    this.db.collections.boards.find({}).fetch()
      .then(boards => callback(boards.map(doc => fromMongo<Board>(doc))))
    return () => this.boardSubscribers.delete(callback)
  }

  getBoard(boardId: string, callback: (board: Board | null) => void): Unsubscribe {
    let subscribers = this.boardByIdSubscribers.get(boardId)
    if (!subscribers) {
      subscribers = new Set()
      this.boardByIdSubscribers.set(boardId, subscribers)
    }
    subscribers.add(callback)
    this.db.collections.boards.findOne({ _id: boardId })
      .then(board => callback(board ? fromMongo<Board>(board) : null))
    return () => {
      const subscribers = this.boardByIdSubscribers.get(boardId)
      if (subscribers) {
        subscribers.delete(callback)
        if (subscribers.size === 0) {
          this.boardByIdSubscribers.delete(boardId)
        }
      }
    }
  }

  async setCard(card: Card): Promise<void> {
    const doc = toMongo(card)
    await this.db.collections.cards.upsert(doc)
    this.notifyCardsByBoardSubscribers(card.boardId)
    this.notifyCardByIdSubscribers(doc._id)
  }

  async removeCard(cardId: string): Promise<void> {
    const card = await this.db.collections.cards.findOne({ _id: cardId })
    if (card) {
      await this.db.collections.cards.remove(cardId)
      this.notifyCardsByBoardSubscribers(card.boardId)
      this.notifyCardByIdSubscribers(cardId)
    }
  }

  getCardsByBoard(boardId: string, callback: (cards: Card[]) => void): Unsubscribe {
    let subscribers = this.cardsByBoardSubscribers.get(boardId)
    if (!subscribers) {
      subscribers = new Set()
      this.cardsByBoardSubscribers.set(boardId, subscribers)
    }
    subscribers.add(callback)
    this.db.collections.cards.find({ boardId }).fetch()
      .then(cards => callback(cards.map(doc => fromMongo<Card>(doc))))
    return () => {
      const subscribers = this.cardsByBoardSubscribers.get(boardId)
      if (subscribers) {
        subscribers.delete(callback)
        if (subscribers.size === 0) {
          this.cardsByBoardSubscribers.delete(boardId)
        }
      }
    }
  }

  getCard(cardId: string, callback: (card: Card | null) => void): Unsubscribe {
    let subscribers = this.cardByIdSubscribers.get(cardId)
    if (!subscribers) {
      subscribers = new Set()
      this.cardByIdSubscribers.set(cardId, subscribers)
    }
    subscribers.add(callback)
    this.db.collections.cards.findOne({ _id: cardId })
      .then(card => callback(card ? fromMongo<Card>(card) : null))
    return () => {
      const subscribers = this.cardByIdSubscribers.get(cardId)
      if (subscribers) {
        subscribers.delete(callback)
        if (subscribers.size === 0) {
          this.cardByIdSubscribers.delete(cardId)
        }
      }
    }
  }

  async setChat(chat: Chat): Promise<void> {
    const doc = toMongo(chat)
    await this.db.collections.chats.upsert(doc)
    this.notifyChatsByBoardSubscribers(chat.boardId)
    this.notifyChatByIdSubscribers(doc._id)
  }

  async removeChat(chatId: ChatId): Promise<void> {
    const chat = await this.db.collections.chats.findOne({ _id: chatId })
    if (chat) {
      await this.db.collections.chats.remove(chatId)
      this.notifyChatsByBoardSubscribers(chat.boardId)
      this.notifyChatByIdSubscribers(chatId)
    }
  }

  getChatsByBoard(boardId: string, callback: (chats: Chat[]) => void): Unsubscribe {
    let subscribers = this.chatsByBoardSubscribers.get(boardId)
    if (!subscribers) {
      subscribers = new Set()
      this.chatsByBoardSubscribers.set(boardId, subscribers)
    }
    subscribers.add(callback)
    this.db.collections.chats.find({ boardId }).fetch()
      .then(chats => callback(chats.map(doc => fromMongo<Chat>(doc))))
    return () => {
      const subscribers = this.chatsByBoardSubscribers.get(boardId)
      if (subscribers) {
        subscribers.delete(callback)
        if (subscribers.size === 0) {
          this.chatsByBoardSubscribers.delete(boardId)
        }
      }
    }
  }

  getChat(chatId: ChatId, callback: (chat: Chat | null) => void): Unsubscribe {
    let subscribers = this.chatByIdSubscribers.get(chatId)
    if (!subscribers) {
      subscribers = new Set()
      this.chatByIdSubscribers.set(chatId, subscribers)
    }
    subscribers.add(callback)
    this.db.collections.chats.findOne({ _id: chatId })
      .then(chat => callback(chat ? fromMongo<Chat>(chat) : null))
    return () => {
      const subscribers = this.chatByIdSubscribers.get(chatId)
      if (subscribers) {
        subscribers.delete(callback)
        if (subscribers.size === 0) {
          this.chatByIdSubscribers.delete(chatId)
        }
      }
    }
  }
}
