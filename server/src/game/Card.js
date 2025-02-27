export default class Card {
    constructor(rank, suit) {
        this.rank = rank;
        this.suit = suit;
    }

    getRank() {
        return this.rank;
    }

    getSuit() {
        return this.suit;
    }   

    toString() {    
        return `${this.rank} of ${this.suit}`;
    }   
}   
