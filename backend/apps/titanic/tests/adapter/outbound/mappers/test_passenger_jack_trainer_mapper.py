from types import SimpleNamespace

import pytest

from titanic.adapter.outbound.mappers.passenger_jack_trainer_mapper import PassengerJackTrainerMapper
from titanic.domain.entities.passenger_jack_trainer_entity import Passenger
from titanic.domain.value_objects.passenger_jack_trainer_vo import Gender


def _make_orm(**overrides):
    defaults = dict(
        id=1,
        passenger_id="P001",
        name="Dawson, Mr. Jack",
        gender="male",
        age="30.0",
        sib_sp="0",
        parch="0",
        survived="0",
    )
    defaults.update(overrides)
    return SimpleNamespace(**defaults)


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


class TestToEntity:
    def test_maps_id(self):
        entity = PassengerJackTrainerMapper.to_entity(_make_orm(id=42))
        assert entity.id == 42

    def test_maps_passenger_id(self):
        entity = PassengerJackTrainerMapper.to_entity(_make_orm(passenger_id="P099"))
        assert entity.passenger_id == "P099"

    def test_maps_name(self):
        entity = PassengerJackTrainerMapper.to_entity(_make_orm(name="Smith, Mr. John"))
        assert entity.name is not None
        assert entity.name.value == "Smith, Mr. John"

    def test_maps_gender_male(self):
        entity = PassengerJackTrainerMapper.to_entity(_make_orm(gender="male"))
        assert entity.gender == Gender.MALE

    def test_maps_gender_female(self):
        entity = PassengerJackTrainerMapper.to_entity(_make_orm(gender="female"))
        assert entity.gender == Gender.FEMALE

    def test_maps_age(self):
        entity = PassengerJackTrainerMapper.to_entity(_make_orm(age="25.0"))
        assert entity.age.value == 25.0

    def test_maps_family_relations(self):
        entity = PassengerJackTrainerMapper.to_entity(_make_orm(sib_sp="2", parch="3"))
        assert entity.family_relations.sib_sp == 2
        assert entity.family_relations.parch == 3

    def test_survived_1_maps_to_true(self):
        entity = PassengerJackTrainerMapper.to_entity(_make_orm(survived="1"))
        assert entity.is_survived is True

    def test_survived_0_maps_to_false(self):
        entity = PassengerJackTrainerMapper.to_entity(_make_orm(survived="0"))
        assert entity.is_survived is False

    def test_empty_passenger_id_raises(self):
        with pytest.raises(ValueError, match="Passenger ID"):
            PassengerJackTrainerMapper.to_entity(_make_orm(passenger_id=None))

    def test_none_name_maps_to_none(self):
        entity = PassengerJackTrainerMapper.to_entity(_make_orm(name=None))
        assert entity.name is None


class TestToOrm:
    def test_survival_true_serializes_to_string_1(self):
        entity = _make_passenger(survived_str="1")
        row = PassengerJackTrainerMapper.to_orm(entity)
        assert row.survived == "1"

    def test_survival_false_serializes_to_string_0(self):
        entity = _make_passenger(survived_str="0")
        row = PassengerJackTrainerMapper.to_orm(entity)
        assert row.survived == "0"

    def test_unknown_gender_serializes_to_none(self):
        entity = _make_passenger(gender_str=None)
        row = PassengerJackTrainerMapper.to_orm(entity)
        assert row.gender is None
