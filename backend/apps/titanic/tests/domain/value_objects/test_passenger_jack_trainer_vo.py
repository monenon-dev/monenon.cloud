import pytest

from titanic.domain.value_objects.passenger_jack_trainer_vo import Age, FamilyRelations, Gender


class TestGender:
    def test_from_str_male(self):
        assert Gender.from_str("male") == Gender.MALE

    def test_from_str_female(self):
        assert Gender.from_str("female") == Gender.FEMALE

    def test_from_str_none_is_unknown(self):
        assert Gender.from_str(None) == Gender.UNKNOWN

    def test_from_str_uppercase_is_normalized(self):
        assert Gender.from_str("MALE") == Gender.MALE

    def test_from_str_unrecognized_string_is_unknown(self):
        assert Gender.from_str("other") == Gender.UNKNOWN


class TestAge:
    def test_from_str_valid_string(self):
        assert Age.from_str("22.5").value == 22.5

    def test_from_str_none_is_unknown(self):
        assert Age.from_str(None).value is None

    def test_from_str_empty_string_is_unknown(self):
        assert Age.from_str("").value is None

    def test_negative_age_raises(self):
        with pytest.raises(ValueError, match="음수"):
            Age(value=-1.0)

    def test_from_str_nan_is_unknown(self):
        assert Age.from_str("nan").value is None

    def test_from_str_invalid_raises(self):
        with pytest.raises(ValueError, match="유효하지 않은"):
            Age.from_str("abc")


class TestFamilyRelations:
    def test_total_family_size_sums_sib_sp_and_parch(self):
        assert FamilyRelations(sib_sp=2, parch=3).total_family_size == 5

    def test_from_strs_parses_string_values(self):
        relation = FamilyRelations.from_strs("1", "2")
        assert relation.sib_sp == 1
        assert relation.parch == 2

    def test_from_strs_none_defaults_to_zero(self):
        relation = FamilyRelations.from_strs(None, None)
        assert relation.sib_sp == 0
        assert relation.parch == 0

    def test_negative_sib_sp_raises(self):
        with pytest.raises(ValueError, match="음수"):
            FamilyRelations(sib_sp=-1, parch=0)

    def test_negative_parch_raises(self):
        with pytest.raises(ValueError, match="음수"):
            FamilyRelations(sib_sp=0, parch=-1)
