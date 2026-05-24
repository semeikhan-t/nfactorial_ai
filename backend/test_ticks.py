import unittest
import random
from unittest.mock import patch
from main import init_game_state, _tick, PCStatus, PC

class TestGameTicks(unittest.TestCase):
    def setUp(self):
        # Seed for reproducibility
        random.seed(42)

    @patch('main.asyncio.create_task')
    def test_time_decay_every_two_ticks(self, mock_create_task):
        state = init_game_state()
        # Set controlled times
        for pc in state.pcs:
            pc.minutes_left = 60
            pc.status = PCStatus.OCCUPIED

        # Tick 1 (odd tick): Time should NOT decrease
        _tick(state)
        self.assertEqual(state.tick, 1)
        for pc in state.pcs:
            self.assertEqual(pc.minutes_left, 60)

        # Tick 2 (even tick): Time SHOULD decrease
        _tick(state)
        self.assertEqual(state.tick, 2)
        for pc in state.pcs:
            self.assertEqual(pc.minutes_left, 59)

        # Tick 3 (odd tick): Time should NOT decrease
        _tick(state)
        self.assertEqual(state.tick, 3)
        for pc in state.pcs:
            self.assertEqual(pc.minutes_left, 59)

        # Tick 4 (even tick): Time SHOULD decrease
        _tick(state)
        self.assertEqual(state.tick, 4)
        for pc in state.pcs:
            self.assertEqual(pc.minutes_left, 58)

    @patch('main.asyncio.create_task')
    def test_incident_grace_period_and_loyalty_loss(self, mock_create_task):
        state = init_game_state()
        for pc in state.pcs:
            pc.minutes_left = 100
            pc.status = PCStatus.OCCUPIED
            pc.current_incident = None

        # Add an incident on PC 1
        pc1 = state.pcs[0]
        pc1.current_incident = "Lagging hard"
        pc1.incident_ticks = 0
        state.loyalty = 100

        # Run 5 ticks: incident_ticks should go 1 -> 5, no loyalty loss, no long wait warning
        for i in range(5):
            _tick(state)
            # Ensure no system message about waiting too long is appended
            system_msg = [m for m in state.messages if m.pc_id == pc1.id and m.sender == "system" and "ждёт ответа" in m.text]
            self.assertEqual(len(system_msg), 0)
            # Loyalty should remain 100
            self.assertEqual(state.loyalty, 100)

        self.assertEqual(pc1.incident_ticks, 5)

        # Tick 6: incident_ticks becomes 6, warning message should be sent, loyalty decreases by 2
        _tick(state)
        self.assertEqual(pc1.incident_ticks, 6)
        system_msg = [m for m in state.messages if m.pc_id == pc1.id and m.sender == "system" and "ждёт ответа" in m.text]
        self.assertEqual(len(system_msg), 1)
        self.assertEqual(state.loyalty, 98)

        # Tick 7: loyalty decreases by 2 more
        _tick(state)
        self.assertEqual(state.loyalty, 96)

if __name__ == '__main__':
    unittest.main()
