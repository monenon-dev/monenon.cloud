import pytest

from titanic.domain.entities.passenger_jack_trainer_entity import Passenger, PassengerName
from titanic.domain.value_objects.passenger_jack_trainer_vo import Gender


def _make_passenger(**overrides) -> Passenger:
    defaults = dict(
        db_id=1,
        passenger_id="P001",
        name_str="Dawson, Mr. Jack",
        gender_str="male",
        age_str="30.0",
        sib_sp_str="0",
        parch_str="0",
        survived_str="0",
    )
    defaults.update(overrides)
    return Passenger.create(**defaults)


class TestPassengerCreate:
    def test_maps_all_fields_correctly(self):
        passenger = _make_passenger(
            db_id=5,
            passenger_id="P005",
            name_str="Smith, Mrs. Jane",
            gender_str="female",
            age_str="42.0",
            sib_sp_str="1",
            parch_str="2",
            survived_str="1",
        )

        assert passenger.id == 5
        assert passenger.passenger_id == "P005"
        assert passenger.name is not None
        assert passenger.name.value == "Smith, Mrs. Jane"
        assert passenger.gender == Gender.FEMALE
        assert passenger.age.value == 42.0
        assert passenger.family_relations.sib_sp == 1
        assert passenger.family_relations.parch == 2
        assert passenger.is_survived is True

    def test_survived_0_is_false(self):
        assert _make_passenger(survived_str="0").is_survived is False

    def test_empty_passenger_id_raises(self):
        with pytest.raises(ValueError, match="Passenger ID"):
            _make_passenger(passenger_id="")

    def test_none_name_maps_to_none(self):
        passenger = _make_passenger(name_str=None)
        assert passenger.name is None


class TestPassengerName:
    def test_valid_name_creates_successfully(self):
        name = PassengerName("Dawson, Mr. Jack")
        assert name.value == "Dawson, Mr. Jack"

    def test_empty_string_raises(self):
        with pytest.raises(ValueError):
            PassengerName("")

    def test_single_char_raises(self):
        with pytest.raises(ValueError):
            PassengerName("A")


class TestPassengerBehavior:
    def test_change_name_updates_name(self):
        passenger = _make_passenger()
        passenger.change_name("Rose, Ms. DeWitt")
        assert passenger.name is not None
        assert passenger.name.value == "Rose, Ms. DeWitt"

    def test_clear_events_empties_list(self):
        passenger = _make_passenger()
        passenger.domain_events.append("event")
        passenger.clear_events()
        assert passenger.domain_events == []
