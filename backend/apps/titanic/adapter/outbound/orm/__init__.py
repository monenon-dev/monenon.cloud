from titanic.adapter.outbound.orm.passenger_jack_trainer_orm import PassengerJackTrainerOrm
from titanic.adapter.outbound.orm.passenger_rose_model_orm import PassengerRoseModelOrm

BookingOrm = PassengerRoseModelOrm
PersonOrm = PassengerJackTrainerOrm
Booking = BookingOrm
Person = PersonOrm
TitanicRecord = PersonOrm

__all__ = ["BookingOrm", "Booking", "PersonOrm", "Person", "TitanicRecord"]
