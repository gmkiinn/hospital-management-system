import enum


class UserRole(enum.StrEnum):
    ADMIN = "admin"
    RECEPTIONIST = "receptionist"
    PATIENT = "patient"
    DOCTOR = "doctor"
    PHARMACIST = "pharmacist"


class Gender(enum.StrEnum):
    MALE = "male"
    FEMALE = "female"
    OTHER = "other"


class AppointmentSource(enum.StrEnum):
    ONLINE = "online"
    WALK_IN = "walk_in"


class AppointmentStatus(enum.StrEnum):
    BOOKED = "booked"
    ARRIVED = "arrived"
    IN_CONSULTATION = "in_consultation"
    COMPLETED = "completed"
    CANCELLED = "cancelled"
    NO_SHOW = "no_show"
